# ▶ Pelihalli

Pelilauncher, jossa on 13 peliä: **Warzone Arena**, **Tahti**, **Highway Rush** ja 10 minipeliä.
Mukana tilit, tasot, saavutukset ja peliaika.

## Asenna (suositeltu – ei Windowsin varoitusta)
1. Avaa **https://knh19.github.io/pelihalli/** Edgellä tai Chromella.
2. Paina **⬇ Asenna sovellukseksi** (tai osoiterivin asennuskuvaketta).
3. Pelihalli ilmestyy Käynnistä-valikkoon ja työpöydälle omana sovelluksenaan.

Sovellus päivittyy itsestään aina kun repoon tulee muutoksia ja toimii myös ilman nettiä.

## Exe-versio
Vaihtoehtoisesti `Pelihalli-Windows.zip` kohdasta **Releases** (Windows saattaa varoittaa allekirjoittamattomasta ohjelmasta).

## Automaattiset päivitykset
Pelihalli tarkistaa **10 sekunnin välein** tästä reposta tiedoston `app/manifest.json`.
Jos versio on uudempi, se lataa vain muuttuneet tiedostot ja latautuu uudelleen heti, kun et ole pelin keskellä.
Uuden pelin takia ei siis tarvitse ladata uutta Pelihallia. Ilman nettiä käytetään viimeisintä ladattua versiota.

Päivityslähteen voi asettaa kahdella tavalla:
- Pelihallissa: **Asetukset → Päivityslähde (GitHub)**, esim. `käyttäjä/pelihalli`, ja sitten **Tarkista nyt**.
- Pysyvästi kaikille: kirjoita repo tiedostoon `update.json` ennen exen rakentamista.

Repon on oltava **julkinen**, jotta päivitykset voi hakea ilman kirjautumista.

## Uuden pelin tai päivityksen julkaisu
1. Lisää tai päivitä peli kansioon `app/games/<nimi>/index.html`.
2. Lisää uusi peli launcherin listaan (`app/index.html`, taulukko `G`).
3. Aja `npm run manifest`, joka nostaa versionumeroa ja laskee tarkistussummat.
4. Commitoi ja pushaa. Kaikki Pelihallit päivittyvät seuraavalla käynnistyksellä.

Uuden exen saa rakennettua tagilla (`git tag v1.2.0 && git push --tags`). GitHub Actions rakentaa
Windows-zipin ja liittää sen Releasesiin. Exeä tarvitsee päivittää vain, jos `main.js` muuttuu.

## Sähköpostivarmistus
Uudet tilit voidaan vahvistaa sähköpostilla ilmaisen [Supabase](https://supabase.com)-palvelun avulla:
1. Luo tili osoitteessa supabase.com ja uusi projekti (Free).
2. **Authentication → Providers → Email**: varmista, että *Confirm email* on päällä (oletus).
3. **Project Settings → API**: kopioi *Project URL* ja *anon public* -avain.
4. Kirjoita ne tiedostoon `app/auth-config.js`, aja `npm run manifest` ja pushaa.

Tämän jälkeen jokainen Pelihalli (päivityksen kautta) pyytää rekisteröityessä sähköpostin
ja lähettää vahvistuslinkin. Kirjautuminen toimii sähköpostilla tai käyttäjänimellä, mukana on
"Unohtuiko salasana?", ja kerran kirjautunut pääsee sisään myös ilman nettiä.
Ilman näitä arvoja käytetään paikallisia tilejä. *anon*-avain on tarkoitettu julkiseksi, sitä ei tarvitse salata.

## Kehitys
```
npm install
npm start        # käynnistä
npm run build    # rakenna dist/Pelihalli-win32-x64
```
Selainversio: avaa `app/index.html`.

Huom: Warzonen online-peli kavereiden kanssa toimii claude.ai-versiossa.
