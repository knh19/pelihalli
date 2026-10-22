// Pelihalli – työpöytäsovellus, joka päivittää pelit automaattisesti GitHubista.
const { app, BrowserWindow, Menu, shell, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, 'update.json'), 'utf8'));
const BUNDLED = path.join(__dirname, 'app');
const liveDir = () => path.join(app.getPath('userData'), 'app-live');
const userConfPath = () => path.join(app.getPath('userData'), 'paivitys.json');
const REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
function repoNow() {
  try { const u = JSON.parse(fs.readFileSync(userConfPath(), 'utf8')); if (typeof u.repo === 'string') return REPO_RE.test(u.repo) ? u.repo : ''; } catch (e) {}
  return CONF.repo && REPO_RE.test(CONF.repo) && !/OMISTAJA/.test(CONF.repo) ? CONF.repo : '';
}
let lastMsg = '';

const readManifest = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) { return null; } };
const cmpV = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return Math.sign(d); } return 0; };
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const SAFE = p => typeof p === 'string' && /^[A-Za-z0-9_\-./]+$/.test(p) && !p.split('/').includes('..') && !p.startsWith('/');
const complete = (dir, m) => m && Array.isArray(m.files) && m.files.every(f => SAFE(f.p) && fs.existsSync(path.join(dir, f.p)));

function current() {
  const b = readManifest(BUNDLED), l = readManifest(liveDir());
  if (l && b && cmpV(l.version, b.version) > 0 && complete(liveDir(), l)) return { dir: liveDir(), man: l };
  return { dir: BUNDLED, man: b || { version: '0.0.0', files: [] } };
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('aikakatkaisu')), ms))]); }
async function fetchBuf(url, ms) {
  const res = await withTimeout(net.fetch(url, { cache: 'no-store' }), ms);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function checkUpdate(cur, status) {
  const repo = repoNow();
  if (!repo && !process.env.PELIHALLI_UPDATE_BASE) return null;
  const [owner, name] = (repo || '/').split('/');
  // GitHub Pages päivittyy nopeasti (välimuisti ohitetaan ?t=), raw.githubusercontent on varalla
  const bases = process.env.PELIHALLI_UPDATE_BASE ? [process.env.PELIHALLI_UPDATE_BASE]
    : [`https://${owner.toLowerCase()}.github.io/${name}/app/`, `https://raw.githubusercontent.com/${repo}/${CONF.branch || 'main'}/app/`];
  status('Tarkistetaan päivityksiä…');
  let remote = null, base = null;
  for (const b of bases) {
    try { const m = JSON.parse((await fetchBuf(b + 'manifest.json?t=' + Date.now(), 7000)).toString('utf8')); if (m && Array.isArray(m.files)) { remote = m; base = b; break; } }
    catch (e) { /* kokeile seuraavaa */ }
  }
  if (!remote) throw new Error('päivityspalvelimeen ei saatu yhteyttä');
  if (!remote || !Array.isArray(remote.files) || cmpV(remote.version, cur.man.version) <= 0) return null;
  if (!remote.files.every(f => SAFE(f.p) && /^[a-f0-9]{64}$/.test(f.s))) throw new Error('virheellinen manifest');
  const tmp = liveDir() + '-tmp';
  fs.rmSync(tmp, { recursive: true, force: true });
  const old = Object.fromEntries((cur.man.files || []).map(f => [f.p, f.s]));
  let i = 0;
  for (const f of remote.files) {
    i++; status(`Päivitetään versioon ${remote.version}… ${i}/${remote.files.length}`);
    const dest = path.join(tmp, f.p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    let buf = null;
    if (old[f.p] === f.s) { try { buf = fs.readFileSync(path.join(cur.dir, f.p)); } catch (e) { buf = null; } }
    if (!buf || sha(buf) !== f.s) buf = await fetchBuf(base + f.p.split('/').map(encodeURIComponent).join('/') + '?v=' + remote.version, 60000);
    if (sha(buf) !== f.s) throw new Error('tarkistussumma ei täsmää: ' + f.p);
    fs.writeFileSync(dest, buf);
  }
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(remote));
  fs.rmSync(liveDir(), { recursive: true, force: true });
  fs.renameSync(tmp, liveDir());
  return { dir: liveDir(), man: remote };
}

const SPLASH = `<html><body style="margin:0;background:#0f0f13;color:#f4f4f6;font-family:Segoe UI,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:14px">
<div style="font-weight:800;letter-spacing:.1em;font-size:28px">▶ PELIHALLI</div><div id="s" style="color:#9b9ba6">Käynnistetään…</div>
<div style="width:220px;height:4px;background:#2a2a32;border-radius:2px;overflow:hidden"><div style="width:40%;height:100%;background:#0a84ff;animation:a 1.2s ease-in-out infinite"></div></div>
<style>@keyframes a{0%{margin-left:-40%}100%{margin-left:100%}}</style></body></html>`;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#0b0b10', title: 'Pelihalli', icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH));
  const status = t => win.webContents.executeJavaScript(`document.getElementById('s').textContent=${JSON.stringify(t)}`).catch(() => {});
  let cur = current(), src = 'paikallinen';
  try { const up = await checkUpdate(cur, status); if (up) { cur = up; src = 'päivitetty'; lastMsg = 'päivitetty juuri'; } else lastMsg = repoNow() ? 'ajan tasalla' : ''; }
  catch (e) { console.log('Päivitys ohitettiin:', e.message); lastMsg = 'tarkistus epäonnistui'; }
  console.log('Pelihalli', cur.man.version, src, cur.dir);
  const open = c => win.loadFile(path.join(c.dir, 'index.html'), { query: { v: c.man.version, src } });
  open(cur);
  ipcMain.handle('upd:info', () => ({ version: current().man.version, repo: repoNow(), last: lastMsg }));
  ipcMain.handle('upd:setRepo', (e, repo) => {
    repo = String(repo).trim(); if (repo && !REPO_RE.test(repo)) return { version: current().man.version, repo: repoNow(), last: 'virheellinen repo' };
    fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(userConfPath(), JSON.stringify({ repo }));
    return { version: current().man.version, repo: repoNow(), last: lastMsg };
  });
  ipcMain.handle('upd:check', async () => {
    try { const up = await checkUpdate(current(), () => {}); if (up) { lastMsg = 'päivitetty juuri'; open(up); return { updated: true }; } lastMsg = 'ajan tasalla'; return { updated: false }; }
    catch (e) { lastMsg = 'tarkistus epäonnistui'; return { updated: false, error: e.message }; }
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
