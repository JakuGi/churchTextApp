# Organista – texty piesní na televízor

Webová aplikácia pre organistu, ktorá na tablete slúži ako ovládanie a na televízore
v kostole premieta texty piesní. Beží úplne lokálne v prehliadači – bez servera,
bez účtu a po prvom spustení aj **bez internetu** (PWA s offline režimom).

## Čo appka vie

- **Číta .xml súbory** s piesňami a ukladá ich do knižnice podľa priečinkov
  (jeden priečinok = jedna zbierka, napr. `JKS`).
- **Špeciálne čísla JKS/LS** – pieseň sa dá nájsť a otvoriť len zadaním čísla
  (`342`, `JKS 342`, `LS 12`) alebo podľa názvu (aj bez diakritiky).
- **Sety piesní** – organista si poskladá poradie piesní na omšu, pomenuje ho a uloží.
- **Režim naživo s veľkými tlačidlami** – posun sloha dopredu/dozadu, číselný výber
  slohy, prepínanie piesní, náhľad toho, čo je práve na televízore.
- **Čierna obrazovka** jedným tlačidlom – televízor zhasne, ale **vybraná sloha
  zostáva označená** a po opätovnom stlačení sa objaví presne tá istá.
- **Rýchly výber čísla počas omše** – veľká číselná klávesnica; pieseň, ktorá nie je
  v sete, sa vloží hneď za práve hranú.
- **Chromecast** – buď cez vlastný prijímač (Cast Application ID), alebo cez
  prenos karty / zrkadlenie obrazovky s oknom `display.html`.

## Rýchly štart

```bash
npm start           # spustí http://localhost:8080
```

Otvor `http://localhost:8080` na tablete (tablet aj počítač musia byť v rovnakej sieti –
použi IP adresu počítača, napr. `http://192.168.1.10:8080`).

Aplikáciu môžeš tiež nahrať na ľubovoľný statický hosting (GitHub Pages, Netlify).
Žiadny build sa nerobí – sú to obyčajné statické súbory.

V prehliadači potom cez ponuku *Pridať na plochu* vytvoríš ikonu a appka sa spúšťa
na celú obrazovku ako bežná tabletová aplikácia.

## Ako to zapojiť na televízor

### A. Vlastný Chromecast prijímač (najlepšia kvalita, odporúčané)

1. Aplikáciu nahraj na hosting s **HTTPS** (napr. GitHub Pages).
2. V [Google Cast SDK Developer Console](https://cast.google.com/publish) zaregistruj
   **Custom Receiver** a ako URL zadaj adresu súboru `receiver.html`
   (napr. `https://mojemeno.github.io/churchTextApp/receiver.html`).
3. Tam istom mieste zaregistruj sériové číslo svojho Chromecastu (kvôli testovaniu
   pred zverejnením).
4. Vo appke → **Nastavenia → Chromecast** vlož *Application ID*.
5. V hornej lište stlač **Pripojiť Chromecast** a vyber televízor.

Texty sa potom posielajú priamo do Chromecastu – tablet môže medzitým zhasnúť,
obraz na TV zostane.

### B. Bez registrácie – prenos karty (funguje hneď)

1. Stlač **Okno na TV** – otvorí sa čierne okno s textom (tlačidlom ⛶ alebo klávesom
   `F` na celú obrazovku).
2. V prehliadači Chrome zvoľ *Prenášať…* → *Zdroje: Prenos karty* (na Androide
   *Prenášať obrazovku* cez Google Home) a vyber televízor.
3. Ovládanie v druhom okne funguje ďalej – obe okná sú prepojené.

Rovnako môžeš okno `display.html` otvoriť na notebooku pripojenom k TV cez HDMI.

## Súbory s piesňami

Aplikácia číta `.xml` súbory. Podporované formáty:

| Formát | Poznámka |
|---|---|
| vlastný (SK aj EN značky) | `<piesen>` / `<song>` – popis v [docs/format-xml.md](docs/format-xml.md) |
| OpenSong | `<song><lyrics>[V1] …` |
| OpenLyrics / OpenLP | `<song><lyrics><verse …>` |

Príklad najjednoduchšieho súboru:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<piesen>
  <nazov>Ó, Bože náš, k Tebe voláme</nazov>
  <cislo typ="JKS">342</cislo>
  <slohy>
    <sloha cislo="1">prvý riadok
druhý riadok</sloha>
    <refren>text refrénu</refren>
    <sloha cislo="2">…</sloha>
  </slohy>
</piesen>
```

Načítanie: **Knižnica → Načítať priečinok** a vyber priečinok so súbormi.
Podpriečinky sa stanú zbierkami. Ak sa priečinok volá `JKS` alebo `LS`, číselník sa
nastaví automaticky; inak sa dá zmeniť v **Nastaveniach → Zbierky piesní**.
Ak číslo v XML chýba, vezme sa z názvu súboru (`342 - Nazov.xml`, `JKS_342.xml`).

Ukážkové piesne sú v priečinku `songs/` – načítaš ich tlačidlom
**Nastavenia → Načítať ukážkové piesne**.

## Ovládanie naživo

| Akcia | Tlačidlo | Klávesa (aj bluetooth pedál) |
|---|---|---|
| Ďalšia sloha | veľké vpravo dole | `→`, `medzerník`, `PageDown` |
| Predošlá sloha | veľké vľavo dole | `←`, `PageUp` |
| Konkrétna sloha | číselné tlačidlá vpravo | `1`–`9`, refrén `0` |
| Čierna obrazovka | veľké uprostred | `B` alebo `.` |
| Ďalšia/predošlá pieseň | pod náhľadom | `↓` / `↑` |
| Rýchly výber čísla | hore vpravo | – |

Na konci poslednej slohy sa šípkou vpravo automaticky prejde na ďalšiu pieseň v sete.

## Nastavenia premietania

Téma (tmavá / svetlá / teplá), veľkosť písma, riadkovanie, zobrazovanie názvu
a čísla slohy, veľké písmená, nezhasínanie tabletu. Veľkosť písma sa navyše
automaticky dopočíta tak, aby sa sloha vždy zmestila na obrazovku a verše sa
pokiaľ možno nezalamovali.

## Vývoj a testy

```bash
npm test     # testy parsera XML (node --test)
```

Štruktúra:

```
index.html        ovládanie (tablet)
display.html      premietacie okno (prenos karty / HDMI)
receiver.html     Chromecast prijímač (Custom Receiver)
js/xmlparse.js    minimálny XML parser bez závislostí
js/songs.js       rozpoznanie formátov, čísla JKS/LS, vyhľadávanie
js/store.js       IndexedDB (piesne, zbierky, sety) + nastavenia
js/import.js      načítanie priečinka so súbormi
js/bus.js         prenos stavu na obrazovky
js/display-core.js vykreslenie textu + automatická veľkosť písma
js/cast.js        Google Cast (odosielanie)
js/app.js         rozhranie a živý režim
```

Dáta zostávajú v tablete (IndexedDB). Zmazať sa dajú v **Nastaveniach → Údržba**.
