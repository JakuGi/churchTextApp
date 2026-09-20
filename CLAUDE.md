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

**Číslovanie verzií:** všetko je zatiaľ **alfa** – `a0.x.y`, teraz `a0.1.8`.
Pôvodné čísla sa premenovali: `1.0.0 → a0.0.0`, `1.0.1 → a0.0.1`,
`1.1.0 → a0.1.0`, `1.1.1 → a0.1.1`. Číslo `1.0.0` je vyhradené pre prvú
odskúšanú verziu.

> **Stále pravidlo od používateľa:** každá ďalšia úprava je nová verzia
> `a0.1.<predchádzajúca+1>`, pokiaľ nepovie inak. A vždy, keď sa opraví chyba,
> doplní sa jej popis do sekcie **predchádzajúcej** verzie v `CHANGELOG.md` ako
> *Známe chyby (opravené vo verzii …)* – aby bolo pri každej verzii vidieť,
> čo v nej nefungovalo.
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
| `js/import.js` | import priečinka s piesňami (zbierku berie z piesne) |
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
| `SongPresentation.kt` | `android.app.Presentation` – okno na televízore (`display.html?rezim=tv`, prekresľuje sa počas prelínania) |
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

Testy: `npm test` (Node `--test`, súbory `tests/*.test.js`, momentálne 35
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
- **Stav na obrazovku ide okamžite** (`display-core.js`): obsah sa vypíše hneď
  a prelínanie je len rozsvietenie nového textu. Žiadny `setTimeout` medzi
  prijatím stavu a jeho vykreslením – v okne na druhej obrazovke sa časovače
  môžu oneskoriť a obraz potom zaostával o krok. Každá správa nesie `ts`
  a staršie sa zahadzujú; v Androide ide stav len natívnou cestou.
- **Záloha nesie zbierku aj názov súboru** (`<zbierka>`, `<subor>` v `songToXml`).
  Identifikátor piesne je `zbierka/súbor` (pri viacerých piesňach v súbore
  s `#poradím`), takže po obnove zo zálohy sedia aj uložené sety.
- **Priečinok `Stiahnuté/Organista/piesne` je úložisko piesní.** Číta sa pri
  každom spustení (`loadSongsFolderAtStart`), nové a upravené piesne sa doň
  zapisujú (`writeSongFile`) a zmazané sa z neho mažú (`removeSongFile`) –
  inak by sa pri ďalšom štarte vrátili.
- **Prístup k priečinku:** hlavná cesta je povolenie
  `MANAGE_EXTERNAL_STORAGE` („Prístup ku všetkým súborom“) a potom bežné
  `java.io.File` – vďaka tomu sa nič nevyberá a priečinok je predvolený.
  Cesta sa dá zmeniť (`moveSongsDir` presunie obsah). Keď povolenie nie je,
  použije sa pôvodná cesta cez SAF (strom potvrdený používateľom, uložený
  v `SharedPreferences`).
- **Živý režim ukazuje slohy ako malé obrazovky pod sebou**
  (`renderVerseScreens`), ťuknutím sa premietnu, premietaná má červený rámik
  (`.vscreen.is-live`). Dva pôvodné náhľady sú preč. Obrazovky majú výšku
  `flex: 0 0 calc(50% - 5px)`, aby ich bolo pri scrollovaní vidno vždy dve.
  Z premietania sa dá pieseň rovno upraviť (`editCurrentSong`, návrat cez
  `editorReturn`).
- **Tlačidlo „Set“ v premietaní** (`liveSetDialog`) nahradilo číselnú polohu
  – ukáže celý bežiaci set (`state.live.songs`, nie `state.set.items`, ktoré
  sa počas naživo môžu rozísť), ťuknutím na pieseň sa naň preskočí
  (`jumpToLiveSong`) bez zastavenia premietania. Vyhľadávanie v tom istom
  okne pridáva pieseň na koniec (`addToLiveSet`) – nepreskakuje na ňu, aby
  nezastavilo práve hranú pieseň.
- **Toast notifikácie** (`toast()` v `app.js`): vždy sa okamžite ukáže
  posledná správa; keď bol pásik práve v polovici miznutia (`is-visible`
  odstránené, CSS prechod ešte beží), vynúti sa `void box.offsetWidth`
  pred návratom triedy – inak vedel prechod zamrznúť v polceste (rovnaký
  trik ako pri prelínaní na TV). Front rady sa zámerne nepoužíva – spôsoboval
  zobrazovanie zastaraných správ pri rýchlom opakovanom ťukaní.
- **Klik do textového poľa ho posunie navrch** jeho scrollovaného kontajnera
  (globálny `focusin` listener v `bindEvents()`, `input/textarea → scrollIntoView`).
  Overené len na skutočný klik/ťuknutie – programové `.focus()` cez
  Playwright/DevTools protokol niekedy `scrollIntoView({behavior:'smooth'})`
  nevykoná (automatizačná zvláštnosť, reálny dotyk funguje).
- **Veľkosť textu** (`display-core.js`): binárne hľadanie hľadá najväčšie
  písmo medzi `fontMin` a `fontMax` (% výšky plochy s textom). Riadkovanie zo
  súboru sa zachová, ak by zalomenie prinieslo menej než 10 % veľkosti navyše
  alebo ak by bolo písmo pod `fontMin`. Na záver `shrinkToFit` overí, že text
  naozaj nepreteká.
- **Úprava piesne počas premietania beží na pozadí** (`app.js`,
  `setView`/`updatePresentingIndicator`): `editCurrentSong()` volá
  `openEditor(song, 'live', { keepPresenting: true })`, čo nastaví
  `presentingInBackground = true` a nevypína premietanie (`publish()` berie
  do úvahy aj tento flag, nielen `state.view === 'live'`). Vrchný panel
  dostane triedu `is-presenting-bg` (červený nádych, `css/app.css`) a odznak
  `#presentingBadge`. Odchod z úpravy inam než späť do živého režimu
  (`abandoningBackgroundEdit`) premietanie až vtedy vypne (čierna obrazovka).
- **Ukladanie piesne bez prekreslenia celej knižnice** (`onSave` v
  `setupEditor()`): namiesto `store.putSongs` + `store.putFolder` +
  `reloadLibrary()` (čo pri veľkej zbierke znamená viacnásobné čítanie a
  zápis celej JSON tabuľky cez most do Androidu) sa `state.songs`/`folders`
  upravia v pamäti a zapíšu sa raz cez `store.replaceSongs`/`replaceFolders`
  (`nativeBackend.replaceAll` – len zápis, žiadne interné čítanie). Na
  strane Androida (`MainActivity.kt`) pribudla aj medzipamäť SAF priečinkov
  a súborov (`safDirCache`, `safFileCache`), lebo `DocumentFile.findFile()`
  robí pri každom volaní celý výpis priečinka cez ContentProvider – pomáha
  to len pri opakovanom ukladaní do toho istého priečinka v rámci behu
  appky, nie pri prvom uložení.
- **Sety sa ukladajú aj do súborov** vedľa priečinka s piesňami
  (`Stiahnuté/Organista/sety`, `setsDir()` v `MainActivity.kt` odvodené z
  `songsDir().parentFile`) – funguje len s povoleným `MANAGE_EXTERNAL_STORAGE`
  (bez SAF fallbacku, lebo `DocumentFile` strom sa nedá jednoducho posunúť
  na súrodenecký priečinok mimo pôvodne vybraného stromu). Načítavajú sa pri
  štarte rovnako ako piesne (`loadSetsFolderAtStart()`).
- **Načítavací pásik ukazuje každé číslo aj percentá** (`showProgress()`):
  signalizácia priebehu je oddelená od prenosu obsahu – nová správa
  `organistaImportTick` chodí za každý súbor zvlášť (lacná, len číslo),
  zatiaľ čo `organistaImportChunk` posiela obsah dávkovo po 25 (kvôli
  rýchlosti mosta).
- **Rýchly výber čísla pri premietaní hľadá podľa predpony**
  (`quickMatches()`): zadanie „25“ nájde všetky piesne, ktorých číslo
  predponou „25“ začína (25, 250, 251, …), zoradené tak, že presná zhoda je
  vždy prvá.
- **Čas a batéria vo vrchnom paneli** (`.statusbar`, `startStatusBar()`):
  čas sa počíta v JS (`toLocaleTimeString`), batéria ide cez nový natívny
  most `OrganistaNative.batteryLevel()` (Kotlin `BatteryManager`,
  `MainActivity.batteryLevel()`) – webová Battery Status API je vo väčšine
  prehliadačov zrušená/skrytá, natívny most je spoľahlivejší. Prvky majú
  spoločnú triedu (`.statusbar__time`, `.statusbar__battery`), nie id, lebo
  sa vykresľujú na dvoch miestach naraz (vrchný panel aj premietanie) a
  aktualizujú sa spolu (`$$(...).forEach`).
- **Opakovaná automatická záloha každých 20 minút je vypnutá**
  (`startAutoBackup()` už nevolá `setInterval`) – zbytočná odkedy sa
  knižnica zapisuje priamo do priečinka s piesňami pri každej zmene. Záloha
  pri spustení a pred inštaláciou aktualizácie (`autoBackup()`) zostáva.
- **Vyhľadávanie v knižnici sa vyprázdňuje** (`clearLibrarySearch()`) pri
  prepnutí zbierky a pri pridaní nájdenej piesne do setu – inak filtrovalo
  knižnicu podľa starého textu aj potom, čo už nebol dôvod.
- **Tlačidlo čiernej obrazovky a rámik premietanej slohy sú teraz zelené**,
  keď je obrazovka čierna (šípka, „ZOBRAZIŤ TEXT“) a **červené**, keď sa
  premieta text („ZASTAVIŤ“) – opačne než pôvodne, pretože červená má
  organistu upozorniť na akciu, ktorú spraví ďalším ťuknutím (zastaviť), nie
  na aktuálny stav.
- **Rozpracovaný set sa priebežne zálohuje** (`persistCurrentSetBackup()`,
  volané z `renderSetList()` pri každej zmene, teda po každej mutácii
  `state.set.items`) pod pevným id `aktualny-set-zaloha` – medzi uložené
  sety aj do priečinka `sety`. Prázdny set zálohu zase zmaže. Pri štarte
  appky ho `restoreCurrentSetBackup()` obnoví do `state.set`, ak appka
  spadla s rozpracovaným (neuloženým) setom.
- **Dialóg so sety počas premietania neotvára klávesnicu hneď**
  (`liveSetBtn` po `showModal()` odfokusuje, čo si prehliadač/WebView sám
  zafokusoval) a keď sa klávesnica otvorí ťuknutím do poľa, otvorený dialóg
  sa cez `visualViewport.resize`/`scroll` posunie k vrchu viditeľnej plochy
  a skráti, aby bol celý nad klávesnicou vidno.

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
- **Okno na druhej obrazovke (`Presentation`) sa prekreslí len vtedy, keď ho
  o to niekto požiada.** Jedno `invalidate()` po zmene stavu nestačí – animácia
  potom zamrzne v prvom snímku. Preto sa prekresľuje v slučke po dobu
  prelínania a JS má poistku (`is-settled`), ktorá prechod ukončí natvrdo.
- **V okne druhej obrazovky nie je `window.OrganistaNative`** (most sa pridáva
  len hlavnému WebView). Režim televízora sa preto pozná podľa `?rezim=tv`
  v adrese.
- **WebView na veľkej obrazovke sám zväčšuje písmo** („text autosizing“).
  Bez `settings.layoutAlgorithm = NORMAL` (a `textZoom = 100`) text vytečie
  a na televízore je vidieť menej riadkov než v náhľade.
- Natívne testovanie sa dá obísť falošným mostom `window.OrganistaNative`
  cez Playwright `addInitScript` – takto sa dá overiť aj obnova zo zálohy.
- **Panel rýchleho výberu čísla je ukotvený dole**, preto musia mať nájdené
  piesne stálu výšku a byť **nad** klávesnicou – inak sa tlačidlá pri písaní
  posúvajú.

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
3. Ak sa aplikácia inštaluje nanovo (odinštalovať + inštalovať), knižnica sa
   po spustení obnoví z automatickej zálohy v `Stiahnuté/Organista/autosave/`.
   Čítanie tejto zálohy po preinštalovaní závisí od toho, či Android nechá
   aplikácii prístup k jej starým súborom – ak nie, piesne treba načítať ručne
   cez *Načítať priečinok*.
