# Organista – texty piesní na televízor (aplikácia pre Android)

Aplikácia pre organistu. Na **tablete** máš ovládanie s veľkými tlačidlami,
na **televízore** sa veriacim premietajú texty piesní.

Táto vetva je **natívna aplikácia pre Android** – stiahneš jeden súbor `.apk`,
nainštaluješ do tabletu a funguje. **Žiadna registrácia, žiadny poplatok, žiadny
hosting, žiadny internet.**

---

## Obsah

1. [Inštalácia do tabletu](#1-inštalácia-do-tabletu)
2. [Pripojenie televízora](#2-pripojenie-televízora)
3. [Prvé spustenie: piesne](#3-prvé-spustenie-piesne)
4. [Každá omša: tri kroky](#4-každá-omša-tri-kroky)
5. [Ovládanie počas premietania](#5-ovládanie-počas-premietania)
6. [Písanie a úprava piesní](#6-písanie-a-úprava-piesní)
6b. [Responzóriový žalm z lc.kbs.sk](#6b-responzóriový-žalm-z-lckbssk)
7. [Súbory XML](#7-súbory-xml)
8. [Kde sú uložené dáta a ako ich zálohovať](#8-kde-sú-uložené-dáta-a-ako-ich-zálohovať)
9. [Keď niečo nefunguje](#9-keď-niečo-nefunguje)
10. [Ako to otestovať bez televízora](#10-ako-to-otestovať-bez-televízora)
11. [Pre technicky zdatných](#11-pre-technicky-zdatných)

---

## 1. Inštalácia do tabletu

1. V tablete otvor priamy odkaz na stiahnutie:

   **https://github.com/JakuGi/churchTextApp/releases/download/android-latest/organista-1.1.1.apk**

   (Alebo: stránka projektu na GitHube → vpravo **Releases** → vydanie
   **Organista pre Android (posledná verzia)**.)

   Staršie verzie sa nemažú – každá má vlastné vydanie `v1.0.0`, `v1.0.1`, …
   aj s popisom svojich zmien, takže sa vieš kedykoľvek vrátiť späť.
   Prehľad všetkých zmien je v súbore [CHANGELOG.md](CHANGELOG.md).
2. Počkaj, kým sa súbor stiahne celý.
3. Ťukni na stiahnutý súbor. Android sa spýta na povolenie inštalovať aplikácie
   z tohto zdroja – potvrď **Nastavenia → Povoliť z tohto zdroja** a vráť sa späť.
4. Ťukni **Inštalovať**. Na ploche pribudne ikona **Organista**.

Aplikácia si nepýta prístup ku kontaktom, polohe ani fotkám – k súborom sa
dostane len vtedy, keď jej ty sám vyberieš priečinok s piesňami. Jediné
povolenie, ktoré má, je **internet**, a používa ho výhradne na stiahnutie
responzóriového žalmu z `lc.kbs.sk` (časť 6b). Piesne a sety zostávajú v tablete
a nikam sa neodosielajú.

> **Aktualizácia na novšiu verziu:** stiahni nové APK a nainštaluj cez staré.
> Piesne ani sety sa nestratia. Ak Android inštaláciu odmietne s hláškou
> o podpise, odinštaluj najprv starú verziu – **predtým si však sprav zálohu**
> (časť 8).

---

## 2. Pripojenie televízora

Aplikácia funguje ako OpenSong: **akonáhle zistí, že je pripojená druhá
obrazovka, sama na nej spustí premietanie.** Na tablete zostane ovládanie,
na televízore je len text piesne. Nič sa neprepína ručne.

Druhú obrazovku pripojíš jedným z týchto spôsobov:

| Spôsob | Ako na to |
|---|---|
| **Zrkadlenie na Chromecast** | V nastaveniach tabletu (alebo v aplikácii Google Home) zvoľ **Prenášať obrazovku** a vyber Chromecast. |
| **Bezdrôtový displej (Miracast)** | Nastavenia tabletu → *Pripojené zariadenia* → *Prenášať* / *Smart View*. |
| **HDMI kábel** | Tablet s výstupom HDMI (alebo redukciou USB-C → HDMI) prepoj s televízorom. |

V aplikácii to vidíš takto:

- Hore v lište je **Druhá obrazovka: nepripojená** (oranžová) alebo
  **Druhá obrazovka: názov televízora** (zelená).
- Tlačidlom **📺 Pripojiť obrazovku** otvoríš rovno systémové nastavenia zrkadlenia.
- Po pripojení sa na televízore objaví čierna obrazovka a po spustení piesne text.

> Prečo to nepotrebuje Chromecast appku ani registráciu: Android sám ohlási
> aplikácii, že existuje druhý displej, a dovolí jej naň kresliť niečo iné,
> než je na tablete. Pri zrkadlení obrazovky sa teda **na televízor dostane len
> text**, nie ovládanie.

---

## 3. Prvé spustenie: piesne

Aplikácia je na začiatku prázdna. Piesne do nej dostaneš dvomi spôsobmi:

**a) Načítať priečinok so súbormi `.xml`**

1. Priečinok s piesňami prekopíruj do tabletu (káblom, cez Google Drive, na USB kľúči).
2. V aplikácii: **Knižnica → Načítať priečinok** → vyber priečinok a potvrď.
3. Podpriečinky sa stanú zbierkami: priečinok `JKS` dostane číslovanie JKS,
   priečinok `LS` číslovanie LS.

**b) Napísať pieseň priamo v aplikácii**

**Knižnica → ✎ Nová pieseň** – podrobne v časti [6](#6-písanie-a-úprava-piesní).

---

## 4. Každá omša: tri kroky

1. **Zapni televízor a zrkadlenie** (časť 2). V lište musí svietiť zelená
   *Druhá obrazovka*.
2. **Priprav set**: *Set* → do políčka napíš číslo piesne (napr. `342`) a potvrď.
   Poradie vieš meniť šípkami, set sa dá uložiť pod názvom (napr. `Nedeľa 10:30`).
3. **Ťukni na ▶ Spustiť premietanie** a ovládaj veľkými tlačidlami.

Pieseň, ktorá už v sete je, má namiesto *+ Do setu* zelenú **✓ V sete**, takže
ju nepridáš dvakrát.

---

## 5. Ovládanie počas premietania

| Čo chceš urobiť | Tlačidlo | Klávesa (bluetooth pedál) |
|---|---|---|
| Ďalšia sloha | veľké **ĎALŠIA SLOHA** vpravo dole | `→`, medzerník |
| Predošlá sloha | veľké **PREDOŠLÁ SLOHA** vľavo dole | `←` |
| Skočiť na konkrétnu slohu | číselné tlačidlá vpravo (1, 2, R, 3…) | `1`–`9`, refrén `0` |
| Zhasnúť text na TV | veľké **ČIERNA OBRAZOVKA** v strede | `B` |
| Ďalšia / predošlá pieseň | tlačidlá pod náhľadom | `↓` / `↑` |
| Pieseň mimo setu | **Rýchly výber čísla** hore | – |

- **Náhľad vľavo** ukazuje presne to, čo je v danej chvíli na televízore.
- **Premietanie začína čiernou obrazovkou**, aby sa text objavil až keď chceš –
  prvé stlačenie prostredného tlačidla text zobrazí. Dá sa to vypnúť
  v *Nastaveniach*.
- **Čierna obrazovka nezruší výber slohy** – po vypnutí pokračuješ tam, kde si skončil.
- Tablet počas premietania nezhasína.

### Čo sa dá nastaviť pre obraz na televízore

*Nastavenia → Vzhľad premietania*:

| Voľba | Čo robí |
|---|---|
| **Hlavička na televízore** | či sa hore zobrazuje číslo aj názov piesne, len číslo, len názov, alebo nič |
| **Prelínanie pri zmene slohy** | jemný prechod namiesto tvrdého preblikania (vypnuté / jemné / stredné / pomalé); platí aj pre čiernu obrazovku |
| **Zobrazovať číslo slohy v rohu obrazovky** | malé „2.“ / „Refrén“ vpravo dole |
| **Zobrazovať číslo slohy pred textom** | text začne ako „**1.** Ó, Bože náš…“, refrén ako „**R:** …“ |
| **Spustiť premietanie s čiernou obrazovkou** | správanie popísané vyššie |
| Téma, veľkosť písma, riadkovanie, veľké písmená | vzhľad textu |

---

## 6. Písanie a úprava piesní

**Knižnica → ✎ Nová pieseň.** Vyplň názov, zbierku, prípadne spevník a číslo,
a píš text – **každý spievaný riadok na samostatný riadok**. Vpravo vidíš živý
náhľad toho, ako to bude vyzerať na televízore.

- **+ Pridať slohu** / **+ Pridať refrén** pridá ďalšiu časť.
- **Vložiť celý text naraz**: vlož skopírovaný text piesne a aplikácia ho sama
  rozdelí – slohy oddelené **prázdnym riadkom**, refrén označený `R:` alebo
  `Refrén:`, čísla slôh (`1.`, `2)`) sa použijú ako popisky.
- Slohy vieš presúvať (▲▼), duplikovať (⧉) a mazať (✕).
- Existujúcu pieseň upravíš tlačidlom **✎** pri piesni v knižnici.
- Rozpísaná pieseň sa nestratí – pri ďalšom otvorení editora ju appka ponúkne obnoviť.
- **Stiahnuť XML** uloží pieseň do priečinka *Stiahnuté/Organista*.

---

## 6b. Responzóriový žalm z lc.kbs.sk

Žalm na daný deň si nemusíš prepisovať ručne – aplikácia ho stiahne
z liturgického kalendára KBS a pripraví na premietanie.

### Ako to použiť

1. V **Knižnici** ťukni vľavo dole na **📖 Žalm na dnes**.
2. Otvorí sa okno, ktoré hneď načíta dnešný deň. Iný deň vyberieš tlačidlami
   **Dnes / Zajtra / Najbližšia nedeľa**, alebo priamo v poli **Dátum**.
3. Ukáže sa odkaz na žalm (napr. `Ž 111, 7-8. 9. 10`), názov sviatku a **refrén**,
   teda to, čo sa spieva a čo sa bude premietať.
4. Máš dve možnosti:
   - **▶ Premietať teraz** – žalm sa hneď premieta a nikam sa neukladá
     (po zavretí aplikácie zmizne);
   - **Uložiť medzi žalmy** – pribudne do zbierky **Žalmy** ako pieseň s názvom
     podľa dátumu a sviatku, napr. *17. 9. 2026 – Sv. Kornélia a Cypriána*.
     Odvtedy sa dá pridať do setu ako ktorákoľvek iná pieseň.

Ak má deň viac formulárov (napr. sviatok aj spomienka), nájdené žalmy sa uložia
ako **jedna pieseň a každý žalm je samostatná sloha** – prepínaš ich teda
rovnako ako slohy piesne.

### Čo na to treba

- **Internet** – aplikácia si stránku stiahne pri každom načítaní žalmu.
  Je to jediná vec, na ktorú aplikácia internet potrebuje; piesne aj sety
  zostávajú v tablete.
- Vo verzii pre prehliadač to funguje pri spustení cez `npm start` (stránku
  stiahne priložený server). Zo statického hostingu to prehliadač nedovolí,
  lebo ide o cudziu doménu.

### Keď sa žalm nenájde

Okno má položku **Zobraziť načítaný text stránky** – ukáže presne to, čo
aplikácia zo stránky prečítala. Ak by KBS zmenila podobu stránky, podľa tohto
textu sa hľadanie rýchlo doladí.

---

## 7. Súbory XML

Aplikácia číta vlastný formát aj formáty **OpenSong** a **OpenLyrics / OpenLP**.
Najjednoduchší súbor:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<piesen>
  <nazov>Ó, Bože náš, k Tebe voláme</nazov>
  <cislo typ="JKS">342</cislo>
  <slohy>
    <sloha cislo="1">Ó, Bože náš, k Tebe voláme,
v Tvojom dome dnes spolu stojíme.</sloha>
    <refren>Sláva Tebe, Otec náš,
sláva Tebe naveky.</refren>
  </slohy>
</piesen>
```

Podrobný popis: [docs/format-xml.md](docs/format-xml.md). Ukážky: [songs/](songs).

---

## 8. Kde sú uložené dáta a ako ich zálohovať

### Kam ukladá aplikácia

Knižnica piesní, zbierky a sety sú v **súkromnom priečinku aplikácie**:

```
/data/data/sk.organista.texty/files/data/
├── songs.json     všetky piesne
├── folders.json   zbierky (JKS, LS, vlastné…)
└── sets.json      uložené sety
```

Ku každému súboru appka drží ešte `*.bak` – kópiu predchádzajúcej verzie.
Zápis je dvojfázový (najprv `*.tmp`, potom premenovanie), takže ani výpadok
batériu uprostred ukladania knižnicu nezničí. Priečinok je zahrnutý
v zálohovaní Androidu, takže sa prenesie aj na nový tablet.

> ⚠️ **Do tohto priečinka sa z počítača nedostaneš** a je to zámer – takto sa
> k tvojim piesňam nedostane žiadna iná aplikácia. Android ho ukazuje len
> samotnej aplikácii (bez rootnutého zariadenia). Ak chceš nahrať piesne
> z počítača, použi postup nižšie – je jednoduchší a bezpečnejší.

### Ako nahrať piesne z počítača (odporúčaný postup)

1. Tablet pripoj k počítaču USB káblom a na tablete zvoľ **Prenos súborov**.
   V počítači sa objaví ako *Interné úložisko*.
2. Vytvor si tam priečinok, napríklad:

   ```
   Interné úložisko/Organista/Piesne/
   ├── JKS/     ← piesne z Jednotného katolíckeho spevníka
   ├── LS/      ← piesne z Liturgického spevníka
   └── Vlastne/
   ```

   Na tablete je to cesta `/storage/emulated/0/Organista/Piesne`.
3. Nakopíruj do neho svoje `.xml` súbory.
4. Odpoj tablet, otvor Organistu a zvoľ **Knižnica → Načítať priečinok** →
   vyber `Organista/Piesne` → potvrď.
5. Podpriečinky sa stanú zbierkami a piesne sa uložia do aplikácie.

Rovnako to funguje aj cez Google Drive, e-mail či USB kľúč – dôležité je len to,
aby bol priečinok na tablete viditeľný v systémovom výbere súborov.

> Po pridaní ďalších piesní do toho istého priečinka zopakuj krok 4. Piesne
> s rovnakým názvom súboru sa prepíšu, ostatné pribudnú.

### Kam ukladá aplikácia zálohy a exporty

*Nastavenia → Údržba → Zálohovať knižnicu do súboru* a tlačidlo **Stiahnuť XML**
v editore ukladajú do:

```
Interné úložisko/Download/Organista/
```

Na tablete je to `/storage/emulated/0/Download/Organista/`. Tento priečinok
z počítača **vidíš**, takže si zálohu vieš hneď odložiť. Záloha je jeden `.xml`
súbor so všetkými piesňami a načítaš ju späť rovnako ako ktorýkoľvek priečinok
s piesňami.

Odinštalovanie aplikácie zmaže aj jej dáta, preto si pred ním vždy sprav zálohu.

### Verzia pre prehliadač

Tá istá webová verzia spustená v prehliadači (`npm start`) ukladá piesne do
databázy prehliadača (IndexedDB), nie do súborov. Prenesieš ich zálohou do `.xml`
rovnakým tlačidlom.

---

## 9. Keď niečo nefunguje

| Problém | Čo s tým |
|---|---|
| **Android nedovolí inštaláciu APK** | Pri inštalácii potvrď *Povoliť z tohto zdroja*. Súbor musí byť stiahnutý celý (skús znova pri lepšej sieti). |
| **V lište stále svieti „Druhá obrazovka: nepripojená“** | Zrkadlenie sa zapína v nastaveniach tabletu, nie v aplikácii. Tablet aj Chromecast musia byť na rovnakej Wi-Fi. Pomôže tlačidlo *📺 Pripojiť obrazovku*. |
| **Na televízore je to isté, čo na tablete (aj s tlačidlami)** | Zrkadlenie beží, ale druhú obrazovku appka nedostala. Vypni a znova zapni zrkadlenie; niektoré staršie televízory a lacné adaptéry druhú obrazovku nepodporujú. |
| **Televízor je čierny aj po spustení piesne** | Skontroluj, či nie je zapnutá **ČIERNA OBRAZOVKA** (tlačidlo svieti načerveno). |
| **Text je primalý alebo priveľký** | *Nastavenia → Vzhľad premietania → Veľkosť písma*. |
| **Načítanie priečinka nič nenašlo** | Priečinok musí obsahovať súbory `.xml`. Skontroluj, či si vybral správny priečinok (nie napr. *Stiahnuté* ako celok). |
| **Piesne zmizli** | Načítaj poslednú zálohu (*Knižnica → Načítať priečinok* a vyber priečinok so zálohou). |

---

## 10. Ako to otestovať bez televízora

Druhú obrazovku sa dá vyskúšať aj doma pri počítači, bez televízora a bez
Chromecastu. Sú tri možnosti, od najrýchlejšej po najvernejšiu.

### A. Len počítač, bez Androidu (5 minút)

Otestuje všetko okrem natívnej časti – knižnicu, sety, editor, živý režim aj
premietaný text. Je to ten istý kód, aký je v aplikácii.

```bash
npm start
```

Otvor `http://localhost:8080`, načítaj ukážkové piesne (*Nastavenia → Načítať
ukážkové piesne*) a stlač **Okno na TV**. Otvorí sa druhé okno len s textom –
to je presne to, čo uvidia veriaci. Prehádž ho na druhý monitor alebo ho daj
vedľa ovládania a skúšaj prepínať slohy.

### B. Ľubovoľný telefón alebo tablet s Androidom (najlepší pomer námahy a výsledku)

Android má **vstavanú simuláciu druhej obrazovky**, ktorá je presne na testovanie
takýchto aplikácií. Nepotrebuješ televízor ani Chromecast – stačí telefón.

1. Nainštaluj APK (odkaz v časti 1).
2. Zapni **vývojárske nastavenia**: *Nastavenia → Informácie o telefóne* →
   sedemkrát ťukni na **Číslo zostavy**.
3. *Nastavenia → Systém → Pre vývojárov* → v časti *Kreslenie* zapni
   **Simulovať sekundárne obrazovky** a vyber rozlíšenie (napr. 1280×720).
4. Na obrazovke sa objaví malé okno – to je „televízor“.
5. Spusti Organistu, načítaj piesne a stlač **▶ Spustiť premietanie**.

V aplikácii musí naskočiť zelené **Druhá obrazovka: …** a v malom okne sa objaví
text piesne, zatiaľ čo na telefóne zostanú tlačidlá. Presne tak sa to bude
správať s televízorom.

> Aplikácia hľadá obrazovku dvoma spôsobmi – cez `MediaRouter` (to zachytí
> Chromecast a bezdrôtový displej) aj cez `DisplayManager` (to zachytí HDMI
> a práve túto simulovanú obrazovku). Preto test zodpovedá skutočnosti.
>
> Na niektorých telefónoch výrobcovia túto voľbu presunuli alebo vypli. Ak ju
> nenájdeš, použi možnosť C.

### C. Len počítač, emulátor Androidu

1. Nainštaluj [Android Studio](https://developer.android.com/studio).
2. *Device Manager* → vytvor zariadenie (tablet, API 34 alebo 35) a spusti ho.
3. V okne emulátora klikni na **⋯** (Extended controls) → **Displays** →
   **Add secondary display** → zvoľ rozlíšenie → *Apply changes*.
4. Nainštaluj APK: stiahnutý súbor pretiahni myšou do okna emulátora, alebo
   `adb install organista-1.1.1.apk`.
5. Spusti aplikáciu a premietaj – text sa objaví na druhej obrazovke emulátora.

Overiť, či Android naozaj hlási druhú obrazovku, sa dá aj z príkazového riadka:

```bash
adb shell dumpsys display | grep -i presentation
```

### Čo si pri teste všimnúť

| Krok | Čo sa má stať |
|---|---|
| Druhá obrazovka pripojená | badge hore sa zmení na zelený **Druhá obrazovka: …** |
| Spustenie piesne | na druhej obrazovke je text, na tablete ovládanie |
| Ďalšia sloha / iná pieseň | text sa zmení okamžite |
| **ČIERNA OBRAZOVKA** | druhá obrazovka sčernie, vybraná sloha zostane označená |
| Vypnutie druhej obrazovky | badge zoranžovie, aplikácia funguje ďalej |
| Zatvorenie a znovuotvorenie aplikácie | piesne aj sety sú na mieste |

---

## 11. Pre technicky zdatných

### Prečo natívny Android + WebView

Rozhranie, parser XML, čísla JKS/LS, sety, živý režim aj editor sú hotové
a otestované v JavaScripte. Jediné, čo sa vo webe spraviť **nedá**, je druhá
obrazovka – Android ju ponúka cez `Presentation` API a to je natívne rozhranie.

Preto je aplikácia natívny projekt v Kotline, ktorý:

- hostí webovú časť vo `WebView` (načítanú z assets cez `WebViewAssetLoader`,
  nie z internetu),
- sleduje externé displeje cez `MediaRouter` aj `DisplayManager` a na nájdenom
  displeji spustí `Presentation` s druhým `WebView`,
- poskytuje webovej časti most `window.OrganistaNative` (úložisko, import
  priečinka cez SAF, export súborov, nastavenia zrkadlenia).

Capacitor ani Flutter by tú istú funkciu nepriniesli bez rovnakého natívneho
kódu, len by pridali ďalšiu vrstvu a závislosti. Webová časť je **tá istá**, akú
používa verzia pre prehliadač – pri zostavení sa skopíruje do `assets/www`,
takže kód je len jeden.

### Zostavenie APK

```bash
cd android
./gradlew :app:assembleRelease      # výsledok: app/build/outputs/apk/release/
```

Treba JDK 17 a Android SDK (platforma 35). Bez podpisovacích kľúčov sa APK
podpíše ladiacim kľúčom, takže sa dá nainštalovať.

APK zostavuje aj GitHub Actions ([.github/workflows/android.yml](.github/workflows/android.yml))
pri každej zmene. Výsledok zverejní na dvoch miestach:

- **android-latest** – nemenná adresa na stiahnutie vždy najnovšej verzie,
- **v1.1.0**, **v1.0.1**, … – vlastné vydanie pre každú verziu, ktoré sa už
  neprepisuje, takže staršie verzie zostávajú natrvalo dostupné.

Popis zmien si vydania berú zo súboru [CHANGELOG.md](CHANGELOG.md) – pri zvýšení
verzie stačí pridať naň nadpis `## <verzia>` a pod neho zoznam zmien. Staršie
vydania sa dajú doplniť spustením workflow ručne so zaškrtnutou voľbou
*Doplniť popisy zmien ku všetkým existujúcim vydaniam*.

### Vlastný podpisovací kľúč (odporúčané)

Bez vlastného kľúča má každé zostavenie iný podpis a aktualizácia cez existujúcu
inštaláciu zlyhá. Kľúč si vytvoríš raz:

```bash
keytool -genkey -v -keystore organista.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias organista
base64 -w0 organista.jks > organista.jks.base64
```

Obsah `organista.jks.base64` a heslá vlož do *Settings → Secrets and variables →
Actions* ako `ORGANISTA_KEYSTORE_BASE64`, `ORGANISTA_KEYSTORE_PASSWORD`,
`ORGANISTA_KEY_ALIAS`, `ORGANISTA_KEY_PASSWORD`. Súbor `organista.jks` **nikdy
nenahrávaj do repozitára** a odlož si ho – bez neho sa aplikácia nedá aktualizovať.

### Testy

```bash
npm test     # parser XML, čísla JKS/LS, editor, import
```

### Štruktúra

```
android/                        natívna aplikácia (Kotlin, Gradle)
  app/src/main/java/sk/organista/texty/
    MainActivity.kt             WebView, most do JS, import a export súborov
    PresentationController.kt   sledovanie externých displejov
    SongPresentation.kt         druhá obrazovka (televízor)
    Storage.kt                  úložisko s atomickým zápisom
    WebBridge.kt                rozhranie window.OrganistaNative
index.html, js/, css/           webová časť (spoločná s verziou pre prehliadač)
display.html                    obsah druhej obrazovky
server.js                       len pre vývoj vo webovom prehliadači
```
