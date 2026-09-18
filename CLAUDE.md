# Kontext projektu – Organista (texty piesní na TV)

Tento súbor je poznámkový blok pre Clauda (a pre teba), aby sa dalo v novej
konverzácii pokračovať bez zdĺhavého čítania celého repozitára. Pri väčšej
zmene ho aktualizuj.

## 1. Čo aplikácia robí

Aplikácia pre slovenského organistu, ktorá premieta texty piesní na televízor
v kostole. Ovládanie je na tablete, text ide na druhú obrazovku.

- Knižnica piesní zo súborov `.xml`, členená podľa priečinkov na **zbierky**
  (napríklad `JKS`, `Ukazkove`, `Žalmy`).
- Piesne majú názov, špeciálne číslo `JKS` / `LS` a slohy (+ refrén).
- Vyhľadávanie podľa názvu aj podľa čísla; z nájdených piesní sa skladá **set**
  (bez duplicít – druhýkrát sa ukáže „✓ V sete“).
- **Živý režim**: veľké tlačidlá, posun slohy dopredu/dozadu, číselný výber
  slohy, **čierna obrazovka**, ktorá nezruší výber slohy.
- **Editor piesní** priamo v aplikácii (nie XML editor, ale formulár).
- **Žalmy**: responzóriový žalm sa stiahne z `lc.kbs.sk` a dá sa premietnuť
  jednorázovo alebo uložiť do zbierky *Žalmy*.
- Zálohovanie: ručný export + automatická záloha do `autosave/`.

## 2. Vetvy a verzie

| Vetva | Obsah |
| --- | --- |
| `main` | **hlavná vetva** – natívna aplikácia pre Android (to isté ako `claude/organista-android`) |
| `claude/organista-android` | vývojová vetva Androidu, drží sa na tom istom commite ako `main` |
| `claude/cool-feynman-88sk88` | pôvodná webová verzia s prerobeným castingom (nepoužíva sa) |
| `claude/cool-feynman-88sk88-chromecast` | webová verzia s Chromecastom + podrobné README |

> **Pozor:** predvolená vetva repozitára na GitHube je stále
> `claude/cool-feynman-88sk88`. Prepnúť na `main` vie iba vlastník repozitára
> (*Settings → General → Default branch*); Claude na to nemá nástroj.

**Číslovanie verzií:** všetko je zatiaľ **alfa** – `a0.x.y`. Pôvodné čísla sa
premenovali: `1.0.0 → a0.0.0`, `1.0.1 → a0.0.1`, `1.1.0 → a0.1.0`,
`1.1.1 → a0.1.1`. Číslo `1.0.0` je vyhradené pre prvú odskúšanú verziu.
Verzia sa zapisuje na troch miestach a musia sedieť:

- `android/app/build.gradle.kts` – `versionName` (+ zvýš `versionCode`),
- `android/app/src/main/java/sk/organista/texty/WebBridge.kt` – `versionName`,
- `package.json` – `version`.

Ku každej verzii patrí nadpis `## a0.x.y` v `CHANGELOG.md`; z neho si vydanie
na GitHube automaticky berie popis zmien.

## 3. Mapa kódu

Webová časť (spoločná pre prehliadač aj Android; žiadny build krok, čisté ES
moduly):

| Súbor | Za čo zodpovedá |
| --- | --- |
| `index.html` | celé rozhranie ovládania (knižnica, set, živý režim, editor, nastavenia) |
| `js/app.js` | hlavný ovládač – stav, prepínanie pohľadov, sety, nastavenia, zálohy, kontrola aktualizácií |
| `js/songs.js` | model piesne, parsovanie a zápis XML (vlastný formát, OpenSong, OpenLyrics/OpenLP) |
| `js/xmlparse.js` | vlastný XML parser bez závislostí (funguje v prehliadači aj v Node pri testoch) |
| `js/store.js` | ukladanie – IndexedDB / localStorage / natívne súbory v Androide |
| `js/import.js` | import priečinka s piesňami |
| `js/editor.js` | editor piesní |
| `js/psalms.js` | sťahovanie a parsovanie žalmu z `lc.kbs.sk` |
| `js/bus.js` | prenos stavu medzi ovládaním a obrazovkou (BroadcastChannel + localStorage, SSE) |
| `js/cast.js` | Google Cast odosielateľ (len webová vetva) |
| `js/display-core.js` | vykreslenie textu na obrazovke vrátane dopočítania veľkosti písma |
| `display.html`, `receiver.html` | premietacia stránka a Chromecast prijímač |
| `css/app.css` | rozhranie ovládania |
| `css/screen.css` | vzhľad premietaného textu (zdieľa ho obrazovka aj náhľady) |
| `server.js` | voliteľný lokálny server s SSE relayom (`/api/stream`, `/api/state`, `/api/status`) |

Natívna časť (Kotlin, `android/app/src/main/java/sk/organista/texty/`):

| Súbor | Za čo zodpovedá |
| --- | --- |
| `MainActivity.kt` | WebView s `WebViewAssetLoader`, import priečinka (SAF), export do `Stiahnuté/Organista`, sťahovanie žalmu, inštalácia aktualizácie |
| `WebBridge.kt` | `window.OrganistaNative` – most medzi JS a Kotlinom, `versionName` |
| `Storage.kt` | súbory piesní, zbierok a setov v súkromnom priečinku aplikácie |
| `PresentationController.kt` | sledovanie externých displejov (`MediaRouter` + `DisplayManager`) |
| `SongPresentation.kt` | `android.app.Presentation` – okno na televízore |
| `WebApp.kt` | pomocné veci okolo WebView |

## 4. Ako sa to stavia a vydáva

`.github/workflows/android.yml`:

1. spustí `npm test` (unit testy webovej časti),
2. zostaví `:app:assembleRelease`,
3. `android-latest` – vydanie, ktoré sa stále prepisuje (stály odkaz na
   stiahnutie najnovšej verzie),
4. `a0.x.y` – vlastné vydanie pre každú verziu, ktoré sa už neprepisuje,
5. voľby pri ručnom spustení (*Run workflow*):
   - **Doplniť popisy zmien ku všetkým existujúcim vydaniam** – prepíše popisy
     podľa `CHANGELOG.md`,
   - **Premenovať staré vydania v1.x.y na alfa verzie a0.x.y** – jednorazová
     akcia, ktorá už prebehla.

Podpisovanie: ak sú nastavené tajomstvá `ORGANISTA_KEYSTORE_BASE64`,
`ORGANISTA_KEYSTORE_PASSWORD`, `ORGANISTA_KEY_ALIAS`, `ORGANISTA_KEY_PASSWORD`,
APK sa podpíše vlastným kľúčom. **Bez nich má každé zostavenie iný podpis
a aktualizácia bez odinštalovania nefunguje.** Kľúč sa nikdy nesmie dostať do
repozitára. (Toto je stále otvorené – tajomstvá zatiaľ nie sú nastavené.)

Testy: `npm test` (Node `--test`, súbory `tests/*.test.js`, momentálne 33
testov). Testy žalmu používajú uložené stránky v `tests/fixtures/`.

## 5. Dôležité rozhodnutia a prečo

- **Premietanie bez Chromecastu.** V Androide sa používa `Presentation` API:
  keď systém ohlási externý displej (HDMI, bezdrôtový displej, zrkadlenie),
  aplikácia naň sama otvorí premietacie okno. Preto padla požiadavka na
  Chromecast aj na vlastný server.
- **GitHub Pages nestačí** na prenos stavu medzi dvoma zariadeniami – statická
  stránka nemá kam ukladať stav. Možnosti boli Chromecast prijímač, lokálny
  server s SSE alebo natívna druhá obrazovka; vybrala sa tretia.
- **Žalmy:** `lc.kbs.sk/#YYYYMMDD` sa skladá až v prehliadači, kým
  `lc.kbs.sk/?den=YYYYMMDD` vracia hotové HTML – preto sa sťahuje s `?den=`.
  Refrén je riadok `R.:` v úvodných súradniciach stránky; značka `R.:` zostáva
  v texte, „alebo Aleluja“ sa odreže. Názov uloženého žalmu je dátum + názov
  dňa/sviatku, pričom riadok s meninami sa preskakuje aj vtedy, keď je deň
  napísaný na tom istom riadku.
- **Vlastný XML parser**, aby tá istá logika bežala v prehliadači aj v testoch
  v Node bez akejkoľvek závislosti.
- **Ukladanie setu:** rovnaký názov sa spýta na prepísanie, iný názov uloží
  nový set. Tlačidlo *Vyprázdniť* maže len rozpracovaný set.

## 6. Na čo si dať pozor (naučené po tvrdom)

- `[hidden]` musí mať `display: none !important;`, inak ho prebije
  `display: flex` a neviditeľný panel blokuje klikanie.
- `.view` potrebuje `min-width: 0` (a `main` `overflow-x: hidden`), inak sa
  aplikácia na tablete posúva do strán.
- Pri hromadnej úprave súboru vždy over každý zásah (`grep`/`assert`) –
  `str.replace` ticho neurobí nič, keď sa kotva nenájde.
- V premietanom texte sa veľkosť písma dopočítava binárnym hľadaním podľa
  kontajnera; `text-wrap: balance` rozbíja riadky slôh.
- V GitHub Actions nikdy nevkladaj text z `CHANGELOG.md` priamo do príkazu –
  spätné apostrofy by sa vykonali. Používa sa `printf` s premennými prostredia
  a `--notes-file`.
- `android-actions/setup-android` potrebuje `packages: ''` (predvolený zoznam
  obsahuje zrušený balík `tools`).

## 7. Obmedzenia prostredia, v ktorom Claude pracuje

- **Android SDK nie je k dispozícii** (proxy blokuje `dl.google.com`), takže
  APK sa lokálne nezostaví – overuje sa až v GitHub Actions. Lokálne sú Gradle
  8.14.3 a JDK 21.
- Proxy blokuje aj `lc.kbs.sk` a `jakugi.github.io` – žalm sa testuje proti
  uloženým stránkam v `tests/fixtures/`.
- Playwright má prehliadač v `/opt/pw-browsers/`; `setInputFiles` nemá rado
  názvy súborov s diakritikou.
- Na GitHub sa chodí cez nástroje `mcp__github__*`, príkaz `gh` v tomto
  prostredí nie je. Čo `mcp__github__*` nevie (napríklad upraviť vydanie alebo
  značku), sa rieši krokom vo workflow.

## 8. Otvorené veci pre používateľa

1. Prepnúť predvolenú vetvu repozitára na `main`.
2. Nastaviť tajomstvá s podpisovacím kľúčom, aby sa dala aplikácia
   aktualizovať bez odinštalovania.
3. Verziu `a0.1.1` treba do tabletu stiahnuť ručne – staršia inštalácia ešte
   porovnáva staré číslo verzie. Ďalšie aktualizácie už tlačidlo v nastaveniach
   nájde samo.
