// Päivittää app/manifest.json: node tools/make-manifest.js [versio]
// Ilman versiota viimeinen numero kasvaa yhdellä (1.0.4 -> 1.0.5).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const APP = path.join(__dirname, '..', 'app'), MAN = path.join(APP, 'manifest.json');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let old = { version: '1.0.0' }; try { old = JSON.parse(fs.readFileSync(MAN, 'utf8')); } catch (e) {}
const bump = v => { const p = v.split('.').map(Number); p[2] = (p[2] || 0) + 1; return p.join('.'); };
const version = process.argv[2] || (fs.existsSync(MAN) ? bump(old.version) : '1.0.0');
const files = walk(APP).filter(f => f !== MAN).map(f => {
  const b = fs.readFileSync(f);
  return { p: path.relative(APP, f).split(path.sep).join('/'), s: crypto.createHash('sha256').update(b).digest('hex'), b: b.length };
}).sort((a, b) => a.p.localeCompare(b.p));
fs.writeFileSync(MAN, JSON.stringify({ version, date: new Date().toISOString(), files }, null, 1));
console.log('manifest', version, files.length, 'tiedostoa');
