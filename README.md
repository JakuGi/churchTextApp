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
7. [Súbory XML](#7-súbory-xml)
8. [Kde sú uložené dáta a ako ich zálohovať](#8-kde-sú-uložené-dáta-a-ako-ich-zálohovať)
9. [Keď niečo nefunguje](#9-keď-niečo-nefunguje)
10. [Pre technicky zdatných](#10-pre-technicky-zdatných)

---

## 1. Inštalácia do tabletu

1. V tablete otvor stránku projektu na GitHube → vpravo **Releases** →
   vydanie **Organista pre Android (posledná verzia)**.
2. Stiahni súbor `organista-1.0.0.apk`.
3. Ťukni na stiahnutý súbor. Android sa spýta na povolenie inštalovať aplikácie
   z tohto zdroja – potvrď **Nastavenia → Povoliť z tohto zdroja** a vráť sa späť.
4. Ťukni **Inštalovať**. Na ploche pribudne ikona **Organista**.

Aplikácia nepotrebuje žiadne povolenia ani internet. Nepýta si prístup ku
kontaktom, polohe ani fotkám – k súborom sa dostane len vtedy, keď jej ty sám
vyberieš priečinok s piesňami.

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
- **Čierna obrazovka nezruší výber slohy** – po vypnutí pokračuješ tam, kde si skončil.
- Tablet počas premietania nezhasína.

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

- Piesne, zbierky a sety sú v **súkromnom priečinku aplikácie** v tablete.
  Žiadna iná aplikácia sa k nim nedostane a nikam sa neodosielajú.
- Zápis je **dvojfázový**: najprv sa zapíše dočasný súbor, potom sa premenuje,
  a predchádzajúca verzia zostáva ako záloha. Výpadok batérie uprostred
  ukladania teda knižnicu nezničí.
- Priečinok je zahrnutý v **zálohovaní Androidu**, takže pri prenose na nový
  tablet sa piesne prenesú spolu s aplikáciou.
- **Vlastná záloha:** *Nastavenia → Údržba → Zálohovať knižnicu do súboru*.
  Uloží všetky piesne do jedného `.xml` súboru v *Stiahnuté/Organista*. Ten si
  odlož mimo tabletu – pri výmene tabletu ho jednoducho načítaš späť.

Odinštalovanie aplikácie zmaže aj dáta, preto si pred ňou vždy sprav zálohu.

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

## 10. Pre technicky zdatných

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
pri každej zmene a zavesí ho na vydanie **android-latest**.

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
