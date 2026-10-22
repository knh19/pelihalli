# ZombieCam 1.5 / Pelihalli 1.14.0

## Asennus
Tämä on päivityspaketti olemassa olevaan Pelihalli-projektiin, ei koko pelikirjasto.
1. Pura ZIP.
2. Kopioi paketin app-kansion sisältö nykyisen projektisi app-kansioon ja korvaa samannimiset tiedostot. Älä poista muita pelejä tai asetuksia.
3. Julkaise päivitetyt tiedostot samalla tavalla kuin aiemmat Pelihalli-päivitykset.
4. Kaikkien moninpelaajien pitää ladata uusi versio. Tarvittaessa sulje peli ja päivitä Pelihalli Ctrl+F5:llä.

## Muutokset
- Ammuslaatikoissa kolmiulotteinen metallikansi, kahva, reunavahvikkeet, salvat ja patruunamerkinnät. Myös lääkintälaatikko sai uuden mallin. Geometria ja materiaalit ovat jaettuja.
- Esc / kosketusnäytön valikko pysäyttää pelin kaikilta. Muilla lukee esimerkiksi ”Odotetaan, että nislas jatkaa peliä.”
- Vain oman pausen voi vapauttaa. Jos useampi pausettaa samanaikaisesti, kaikkien on jatkettava. Poistuneen pelaajan pause vapautuu verkkoyhteyden havaittua poistumisen.
- Liikkuminen, zombit, aallot, lataaminen ja pudonneiden tavaroiden viiveet pysähtyvät. Verkkoyhteyden ylläpito jatkuu. Taukoa ei lasketa ottelun kestoon.
- Muut pelaajat klikkaavat pelialuetta hiiriohjauksen palauttamiseksi pausen päätyttyä. Tämä klikkaus ei ammu.
- Aalto 5: 2 jättiä; aallot 10 ja 15: 3; aallot 20 ja 25: 4; aallosta 30 alkaen joka viides aalto: 5. Tavalliset zombit tulevat lisäksi.
- Jätit ovat 1,48 kertaa suurempia, noin 4,8 kertaa tavallista kävelevää zombia kestävämpiä, 28 % hitaampia ja tekevät 1,8-kertaisen lähitaisteluvahingon. Jättityyppi välitetään myös muille pelaajille.

## Tarkistukset
Aja projektin juuresta: `node tests/zombiecam.cjs` (Node.js, ei npm-asennusta).
Tarkistettu: JavaScript-syntaksi, aaltorytmi ja jättimäärät, jättien HP/koko/verkkolippu, laatikon 3D-geometria, etäpause ja nimi, jatkamispainikkeen omistajuus, simulaation pysäytys, yhtäaikaiset pauset, poistuminen, ottelukohtaisuus ja aikakorjaus.
Verkko ja käyttöliittymä on simuloitu testeissä. Oikeaa kahden koneen yhteyttä tai visuaalista selaintestiä ei ole varmennettu tässä ympäristössä (testiselaimen lataus epäonnistui).

## Lähde
Liitteen 1.13.0-paketti ei sisältänyt ZombieCamia. Pelin pohja haettiin paketin READMEssä mainitun knh19/pelihalli-repon tiedostosta app/games/zombiecam/index.html, blob 45b790ebc0eeada15f178af349e519888d41d635. Mukana myös repon three.min.js. Muut pelit säilyvät nykyisessä asennuksessasi.
