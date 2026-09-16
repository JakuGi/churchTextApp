# Organista – texty piesní na televízor

Aplikácia pre organistu: na tablete slúži ako ovládanie, na televízore v kostole
premieta veriacim texty piesní. Beží celá v prehliadači – **bez servera, bez účtu,
bez inštalácie a bez internetu**.

---

## Najrýchlejší štart (3 minúty, zadarmo)

1. **Stiahni jediný súbor** [`organista.html`](organista.html) do tabletu
   (v GitHube: *Download raw file*). Nič iné netreba.
2. **Otvor ho** v prehliadači Chrome. Cez ponuku *⋮ → Pridať na plochu* si z neho
   spravíš ikonu ako z bežnej aplikácie.
3. **Načítaj piesne**: *Knižnica → Načítať priečinok* a vyber priečinok s .xml
   súbormi piesní. Zostanú uložené v tablete aj po vypnutí.

Na televízor sa dostaneš tlačidlom **📺 Pripojiť televízor**, ktoré ťa prevedie
nastavením (podrobne nižšie).

> Chceš najprv len vyskúšať, ako to vyzerá? Spusti `npm start` a otvor
> `http://localhost:8080` – tam je aj tlačidlo *Načítať ukážkové piesne*.

---

## Ako dostať text na televízor

Chromecast sám o sebe vie zobraziť len to, čo mu niekto pošle. Existujú tri cesty
a aplikácia zvládne všetky tri:

| | 1. Zrkadlenie tabletu | 2. Druhá obrazovka | 3. Vlastný prijímač |
|---|---|---|---|
| **Cena** | zadarmo | zadarmo | jednorazovo 5 USD |
| **Registrácia** | žiadna | žiadna | Google Cast Developer Console |
| **Externý server / hosting** | netreba | netreba | treba (HTTPS) |
| **Čo treba** | tablet + Chromecast | počítač pri TV (HDMI alebo prenos karty) | Chromecast + registrácia |
| **Ovládanie** | dotykom celej plochy tabletu | veľké tlačidlá v okne ovládania | veľké tlačidlá na tablete |
| **Pre koho** | **väčšina organistov** | kto má pri TV notebook | kto chce maximálnu kvalitu |

### 1. Zrkadlenie tabletu — odporúčané, zadarmo, bez registrácie

Tablet pošle na televízor svoju obrazovku a aplikácia sa prepne do
**prezentačného režimu**: celý displej sa zmení na obraz pre televízor, takže tam
nie sú vidieť žiadne tlačidlá ani zoznamy. Ovláda sa dotykom celej plochy.

**Postup:**

1. Tablet aj Chromecast musia byť na **rovnakej Wi-Fi sieti**.
2. Otvor aplikáciu **Google Home** → ťukni na svoj Chromecast → **Prenášať obrazovku**.
   Na mnohých tabletoch je rovnaká funkcia aj v rýchlych nastaveniach
   (*Prenášať*, *Smart View*, *Screen cast*).
3. Prepni sa späť do aplikácie a stlač **📺 Pripojiť televízor → Spustiť prezentačný
   režim** (v režime naživo je na to tlačidlo **📺 Premietať**).

**Ovládanie v prezentačnom režime** – nič z toho nie je na televízore vidieť:

| Dotyk na tablete | Čo sa stane |
|---|---|
| ťuknutie do **ľavej tretiny** | predošlá sloha |
| ťuknutie do **pravej tretiny** | ďalšia sloha |
| ťuknutie do **stredu** | čierna obrazovka zap/vyp (sloha zostáva vybraná) |
| **podržanie stredu** (pol sekundy) | ponuka: iná pieseň, ukončenie režimu |
| **potiahnutie doľava / doprava** | ďalšia / predošlá pieseň |

Každé ťuknutie potvrdí krátka vibrácia, takže sa netreba pozerať na tablet.
Funguje aj bluetooth pedál alebo prezentér (posiela šípky) – klávesové skratky
sú v tabuľke nižšie. Kto chce mať radšej viditeľné tlačidlá (a nevadí mu, že budú
aj na televízore), zapne si ich v *Nastavenia → Televízor*.

**Tipy pre zrkadlenie:**

- Tablet nechaj **v nabíjačke** – zrkadlenie berie batériu.
- V *Nastaveniach* nechaj zapnuté *Nezhasínať tablet počas premietania*.
- Zamkni si **otočenie na šírku**, aby sa obraz na TV neotáčal.
- Zvuk z tabletu sa pri zrkadlení prenáša tiež – stlm ho.
- Čierne pruhy po stranách sú normálne (tablet má iný pomer strán ako TV);
  pozadie je čierne, takže ich nie je vidieť.

### 2. Druhá obrazovka — keď je pri televízore počítač

Aplikácia otvorí **samostatné čierne okno len s textom**. Ovládanie s veľkými
tlačidlami zostáva v pôvodnom okne.

1. Stlač **📺 Pripojiť televízor → Otvoriť okno s textom**.
2. Okno pretiahni na televízor pripojený **HDMI káblom** a daj ho na celú obrazovku
   (dvojklik alebo tlačidlo ⛶).
3. Ak máš namiesto kábla Chromecast, v prehliadači **Chrome na počítači** zvoľ
   *⋮ → Prenášať… → Zdroje: Prenos karty* a vyber okno s textom. Aj toto je
   zadarmo a bez registrácie.

Obe okná sú prepojené, takže všetko, čo prepneš v ovládaní, sa okamžite objaví
na televízore.

### 3. Vlastný Chromecast prijímač — pokročilé

Posiela text priamo do Chromecastu (tablet potom môže aj zhasnúť). Vyžaduje
jednorazový poplatok 5 USD a umiestnenie súboru `receiver.html` na adresu s HTTPS:

1. Nahraj obsah tohto projektu na hosting s HTTPS (napr. zadarmo cez GitHub Pages).
2. V [Google Cast SDK Developer Console](https://cast.google.com/publish) zaregistruj
   **Custom Receiver** s adresou súboru `receiver.html` a zaregistruj sériové číslo
   svojho Chromecastu.
3. V *Nastavenia → Pokročilé: vlastný Chromecast prijímač* vlož **Application ID**
   a stlač *Pripojiť Chromecast*.

---

## Ovládanie naživo (na tablete)

| Akcia | Tlačidlo | Klávesa / pedál |
|---|---|---|
| Ďalšia sloha | veľké vpravo dole | `→`, `medzerník`, `PageDown` |
| Predošlá sloha | veľké vľavo dole | `←`, `PageUp` |
| Konkrétna sloha | číselné tlačidlá vpravo | `1`–`9`, refrén `0` |
| Čierna obrazovka | veľké uprostred | `B` alebo `.` |
| Ďalšia / predošlá pieseň | pod náhľadom | `↓` / `↑` |
| Rýchly výber piesne podľa čísla | hore vpravo | – |
| Koniec prezentačného režimu | ponuka (podržanie stredu) | `Esc` |

Čierna obrazovka **nezruší výber slohy** – po opätovnom stlačení sa objaví presne
tá istá sloha. Na konci poslednej slohy sa šípkou vpravo prejde na ďalšiu pieseň
v sete.

**Rýchly výber čísla** (tlačidlo hore vpravo) otvorí veľkú číselnú klávesnicu.
Keď kňaz ohlási pieseň, ktorá nie je v sete, stačí zadať číslo – pieseň sa vloží
hneď za práve hranú a pokračuje sa ďalej.

---

## Súbory s piesňami

Aplikácia číta `.xml` súbory. Podporované formáty:

| Formát | Poznámka |
|---|---|
| vlastný (SK aj EN značky) | `<piesen>` / `<song>` – popis v [docs/format-xml.md](docs/format-xml.md) |
| OpenSong | `<song><lyrics>[V1] …` |
| OpenLyrics / OpenLP | `<song><lyrics><verse …>` |

Najjednoduchší súbor:

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

- **Priečinky = zbierky.** Podpriečinok `JKS` dostane automaticky číselník JKS,
  podpriečinok `LS` číselník LS. Zmeniť sa to dá v *Nastavenia → Zbierky piesní*.
- **Čísla JKS/LS** sa berú zo značky `<cislo>`, inak z názvu súboru
  (`342 - Nazov.xml`, `JKS_342.xml`).
- Vyhľadávať sa dá podľa čísla (`342`, `JKS 342`, `LS 12`) aj podľa názvu,
  aj bez diakritiky.

Ukážkové piesne sú v priečinku [`songs/`](songs).

---

## Kde sa dáta ukladajú

Piesne, sety a nastavenia zostávajú v tablete (databáza prehliadača). Nikam sa
neodosielajú. Zmazať sa dajú v *Nastavenia → Údržba*. Aktuálny spôsob uloženia
ukazuje tá istá sekcia – ak prehliadač databázu nepovolí, použije sa náhradná
pamäť s limitom asi 5 MB (stále to stačí na stovky piesní).

---

## Pre pokročilých

### Spustenie cez adresu http (viac priestoru, ukážkové piesne, offline PWA)

```bash
npm start     # http://localhost:8080
```

Tablet sa pripojí na IP adresu počítača (napr. `http://192.168.1.10:8080`), prípadne
celý projekt nahráš na ľubovoľný statický hosting – nič sa nekompiluje.
Pri spustení cez `http://` funguje aj service worker, takže appka beží offline.

### Zostavenie jedného súboru

```bash
npm run build     # vytvorí organista.html zo zdrojov
```

Po každej zmene zdrojov treba `organista.html` znovu vytvoriť.

### Testy

```bash
npm test          # parser XML, čísla JKS/LS, import priečinka, úložisko
```

### Štruktúra

```
organista.html    jednosúborová verzia (výsledok npm run build)
index.html        ovládanie (tablet)
display.html      premietacie okno (HDMI / prenos karty)
receiver.html     Chromecast prijímač (pokročilé)
js/xmlparse.js    minimálny XML parser bez závislostí
js/songs.js       rozpoznanie formátov, čísla JKS/LS, vyhľadávanie
js/store.js       úložisko (IndexedDB, náhrada localStorage) + nastavenia
js/import.js      načítanie priečinka so súbormi
js/bus.js         prenos stavu na obrazovky
js/display-core.js vykreslenie textu + automatická veľkosť písma
js/present.js     prezentačný režim a dotykové zóny
js/cast.js        Google Cast (odosielanie)
js/app.js         rozhranie a živý režim
```
