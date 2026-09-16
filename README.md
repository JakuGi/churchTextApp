# Organista – texty piesní na televízor

Aplikácia pre organistu. Na **tablete** máš ovládanie s veľkými tlačidlami,
na **televízore v kostole** sa veriacim premieta text piesne. Piesne si buď
napíšeš priamo v aplikácii, alebo načítaš zo súborov `.xml`; triedia sa do zbierok
a pieseň sa dá vyvolať aj jednoduchým zadaním čísla z JKS alebo LS.

Tento návod je písaný pre organistu, nie pre programátora. Postupuj krok za krokom
a všetko sa dá zvládnuť za jedno popoludnie.

---

## Obsah

1. [Ako to celé funguje](#1-ako-to-celé-funguje)
2. [Čo potrebuješ](#2-čo-potrebuješ)
3. [Nastavenie krok za krokom (raz za život)](#3-nastavenie-krok-za-krokom-raz-za-život)
   - [A. Aplikácia na internete zadarmo (GitHub Pages)](#a-aplikácia-na-internete-zadarmo-github-pages)
   - [B. Jednorazový poplatok 5 USD a registrácia prijímača](#b-jednorazový-poplatok-5-usd-a-registrácia-prijímača)
   - [C. Registrácia Chromecastu](#c-registrácia-chromecastu)
   - [D. Nastavenie tabletu](#d-nastavenie-tabletu)
   - [E. Načítanie piesní](#e-načítanie-piesní)
4. [Čo robiť na televízore (Android TV, Chromecast, PC)](#4-čo-robiť-na-televízore-android-tv-chromecast-pc)
5. [Každá omša: tri kroky](#5-každá-omša-tri-kroky)
6. [Ovládanie počas premietania](#6-ovládanie-počas-premietania)
7. [Písanie a úprava piesní v aplikácii](#7-písanie-a-úprava-piesní-v-aplikácii)
8. [Piesne zo súborov XML](#8-piesne-zo-súborov-xml)
9. [Keď niečo nefunguje](#9-keď-niečo-nefunguje)
10. [Verzia bez poplatku (náhradné riešenie)](#10-verzia-bez-poplatku-náhradné-riešenie)
11. [Pre technicky zdatných](#11-pre-technicky-zdatných)

---

## 1. Ako to celé funguje

Chromecast je malá krabička (alebo funkcia zabudovaná v televízore), ktorá sa
pripojí na Wi-Fi a vie si **sama stiahnuť webovú stránku z internetu a zobraziť ju
na televízore**. Tablet jej len posiela pokyny typu „teraz ukáž druhú slohu“.

```
    TABLET (ovládanie)                    TELEVÍZOR (text pre veriacich)
 ┌────────────────────────┐            ┌────────────────────────────────┐
 │  Knižnica piesní       │            │                                │
 │  Set na omšu           │   Wi-Fi    │   Ó, Bože náš, k Tebe voláme,  │
 │  ◀ SLOHA   SLOHA ▶     │ ─────────► │   v Tvojom dome dnes stojíme.  │
 │  ČIERNA OBRAZOVKA      │            │                                │
 └────────────────────────┘            └────────────────────────────────┘
        index.html                       Chromecast si stiahne
     (ovládacia stránka)                 stránku receiver.html
```

Aby si Chromecast vedel stiahnuť práve *našu* stránku, musia byť splnené dve veci:

1. **Stránka musí byť niekde na internete** na adrese, ktorá začína `https://`.
   Použijeme na to **GitHub Pages**, ktorý je zadarmo.
2. **Google musí vedieť, že táto stránka smie bežať na Chromecaste.** Preto sa
   stránka zaregistruje v Google Cast konzole a Google si za to účtuje
   **jednorazový poplatok 5 USD** (asi 5 €). Platí sa raz a navždy, žiadne mesačné
   poplatky.

Po registrácii dostaneš **Application ID** – krátky kód (napr. `A1B2C3D4`), ktorý
raz zadáš do aplikácie v tablete. Tým je celé prepojenie hotové.

Dôležité: piesne sú uložené **v tablete**, nie na internete. Na internete je len
samotná aplikácia (jej „program“). Nikto cudzí sa k tvojim piesňam ani k setom
nedostane.

---

## 2. Čo potrebuješ

**Na premietanie (v kostole, každú nedeľu):**

| Vec | Poznámka |
|---|---|
| Tablet s Androidom a prehliadačom **Chrome** | slúži ako ovládanie |
| **Chromecast** pripojený do televízora | stačí lacný základný model |
| **alebo televízor s Android TV / Google TV** | tie majú Chromecast zabudovaný, nič sa nekupuje |
| **Wi-Fi v kostole** | tablet aj Chromecast musia byť na **rovnakej** sieti |
| Nabíjačka k tabletu | premietanie trvá dlho |

**Na jednorazové nastavenie (doma, pri počítači):**

| Vec | Poznámka |
|---|---|
| Počítač s internetom | na tablete by sa to robilo veľmi ťažko |
| **Google účet** (gmail) | ten istý, aký máš v tablete a v Google Home |
| **GitHub účet** | vytvoríš zadarmo, netreba nič vedieť o programovaní |
| **Platobná karta** | jednorazovo 5 USD pre Google |
| Asi **45 minút času** | plus čakanie 15 minút v kroku C |

---

## 3. Nastavenie krok za krokom (raz za život)

> Rady na úvod: rob to v pokoji doma, nie 10 minút pred omšou. Ak si niekde nie si
> istý, pokračuj ďalej – na konci každej časti je kontrola, podľa ktorej zistíš,
> či to ide dobre.

### A. Aplikácia na internete zadarmo (GitHub Pages)

Cieľom tejto časti je dostať súbory aplikácie na internetovú adresu, napríklad
`https://tvojemeno.github.io/churchTextApp/`.

**A1. Vytvor si GitHub účet** (ak ho ešte nemáš)

1. Na počítači otvor [github.com](https://github.com) a klikni na **Sign up**.
2. Zadaj e-mail, heslo a používateľské meno (napr. `jankohudobnik`). Toto meno
   bude v adrese aplikácie, tak nech je jednoduché, bez diakritiky a medzier.
3. Potvrď e-mail, ktorý ti príde.

**A2. Nahraj projekt na svoj GitHub**

Ak už tento projekt na GitHube máš (napr. `JakuGi/churchTextApp`), preskoč na A3.

1. Otvor stránku projektu na GitHube a vpravo hore klikni na **Fork** →
   **Create fork**. Tým vznikne tvoja vlastná kópia.
2. Ak máš súbory len v počítači (stiahnuté ako ZIP), urob to takto:
   klikni vpravo hore na **+** → **New repository** → názov napíš
   `churchTextApp` → zvoľ **Public** → **Create repository** →
   na ďalšej stránke klikni **uploading an existing file** → presuň tam
   **rozbalený obsah** priečinka (všetky súbory a podpriečinky) → dole klikni
   **Commit changes**.

> ⚠️ Repozitár musí byť **Public** (verejný). Na bezplatnom GitHub účte
> nefunguje zverejnenie stránky zo súkromného repozitára. Nie je to problém –
> zverejnený je len program, nie tvoje piesne.

**A3. Zapni GitHub Pages**

1. V svojom repozitári klikni hore na **Settings** (ozubené koliesko).
2. V ľavom stĺpci klikni na **Pages**.
3. Pri položke *Source* zvoľ **Deploy from a branch**.
4. Pri položke *Branch* zvoľ **main** (alebo `master`, podľa toho, čo tam je),
   vedľa nechaj **/ (root)** a klikni **Save**.
5. Počkaj 1–3 minúty a stránku obnov (F5). Hore sa objaví zelený rámček s adresou,
   napríklad:

   ```
   https://tvojemeno.github.io/churchTextApp/
   ```

6. **Túto adresu si zapíš** – budeš ju potrebovať dvakrát.

> **Pre tento repozitár (`JakuGi/churchTextApp`) je časť A už hotová.**
> GitHub Pages je zapnutý a nasadenie prebehlo úspešne, publikuje sa z vetvy
> `claude/cool-feynman-88sk88-chromecast`. Tvoje adresy sú:
>
> - aplikácia (otvor na tablete): `https://jakugi.github.io/churchTextApp/`
> - prijímač (vložíš do Cast konzoly v časti B3): `https://jakugi.github.io/churchTextApp/receiver.html`
>
> Vetvu, z ktorej sa publikuje, vieš kedykoľvek zmeniť v *Settings → Pages*.
> Pokračuj časťou B.

**✅ Kontrola:** otvor v počítači adresu z bodu 5. Musí sa zobraziť aplikácia
s tmavým pozadím a nápisom *Organista*. Ak sa zobrazí chyba „404“, počkaj ešte
pár minút a skús znova.

Tiež si over, že funguje aj adresa premietacej stránky – k adrese pridaj
`receiver.html`:

```
https://tvojemeno.github.io/churchTextApp/receiver.html
```

Musí sa zobraziť **čierna prázdna stránka**. To je správne! Je to obrazovka,
ktorá čaká na text z tabletu.

---

### B. Jednorazový poplatok 5 USD a registrácia prijímača

**B1. Prihlás sa do Google Cast konzoly**

1. Na počítači otvor [cast.google.com/publish](https://cast.google.com/publish).
2. Prihlás sa **tým istým Google účtom**, aký máš v tablete a v aplikácii
   Google Home. (Je to dôležité, aby si potom vedel zaregistrovať Chromecast.)

**B2. Zaplať jednorazový poplatok**

1. Stránka ťa vyzve na registráciu vývojárskeho účtu a na zaplatenie
   **jednorazového poplatku 5 USD**.
2. Odsúhlas podmienky (*Terms of Service*) a klikni na tlačidlo na zaplatenie
   (býva označené ako *Sign up* alebo *Pay registration fee*).
3. Zadaj údaje platobnej karty cez Google Pay a plaťbu potvrď.
4. Po zaplatení sa vráť na [cast.google.com/publish](https://cast.google.com/publish).
   Poplatok sa platí **raz**, nič sa neobnovuje a nič sa neúčtuje mesačne.

**✅ Kontrola:** v konzole sa ti zobrazí prázdny zoznam aplikácií a tlačidlo na
pridanie novej aplikácie.

**B3. Zaregistruj premietaciu stránku**

1. Klikni na **Add new application** (Pridať novú aplikáciu).
2. Z ponuky typov zvoľ **Custom Receiver** (vlastný prijímač).
3. Vyplň:
   - **Name** (názov): napríklad `Organista`
   - **Receiver Application URL**: sem vlož adresu premietacej stránky z časti A:

     ```
     https://tvojemeno.github.io/churchTextApp/receiver.html
     ```

     (Musí začínať `https://` a končiť `receiver.html`.)
   - Ostatné políčka (Google Cast for Audio, DRM a podobne) nechaj nezaškrtnuté.
4. Klikni **Save** (Uložiť).

**B4. Opíš si Application ID**

V zozname aplikácií sa teraz objaví riadok s tvojou aplikáciou a pri ňom
**Application ID** – osem znakov, napríklad `A1B2C3D4`.

**Toto si zapíš alebo pošli e-mailom sebe.** Bez neho sa tablet k televízoru
nespojí. Stav aplikácie bude *Unpublished* (nezverejnená) – to je v poriadku,
na vlastné použitie to stačí. Práve preto ale treba spraviť ešte časť C.

---

### C. Registrácia Chromecastu

Nezverejnená aplikácia sa spustí len na Chromecastoch, ktoré vopred nahlásiš.
Preto treba Google povedať, ktorá krabička to je.

**C1. Zisti sériové číslo Chromecastu**

Máš dve možnosti:

- **Na samotnom zariadení**: sériové číslo (*Serial Number*, začína zvyčajne
  písmenami a číslicami) býva vytlačené drobným písmom priamo na Chromecaste
  alebo na jeho krabici.
- **V aplikácii Google Home** na tablete: ťukni na svoj Chromecast → ozubené
  koliesko (*Nastavenia*) → úplne dole *Informácie o zariadení* / *Technické
  informácie*. Nájdeš tam **sériové číslo**.

**C2. Zapíš ho do konzoly**

1. Na [cast.google.com/publish](https://cast.google.com/publish) prejdi do sekcie
   **Cast Receiver Devices** (Zariadenia) – býva v ľavom menu alebo pod záložkou
   *Devices*.
2. Klikni **Add new device**.
3. Vlož **sériové číslo** a napíš si k nemu poznámku (napr. `Chromecast kostol`).
4. Ulož.

**C3. Počkaj a reštartuj Chromecast**

1. Počkaj **aspoň 15 minút**. Google potrebuje čas, kým sa registrácia prejaví.
2. Potom **vytiahni Chromecast z napájania**, počkaj 10 sekúnd a znovu ho zapoj.

> Ak máte v kostole dva televízory s dvoma Chromecastmi, takto zaregistruj oba.

**✅ Kontrola:** táto časť sa dá overiť až v časti D. Ak sa tam televízor neozve,
najčastejšie ešte neuplynulo 15 minút alebo Chromecast nebol reštartovaný.

---

### D. Nastavenie tabletu

**D1. Otvor aplikáciu v tablete**

1. Na tablete otvor prehliadač **Chrome** (nie iný prehliadač – Cast funguje
   v Chrome).
2. Do adresného riadka napíš adresu z časti A:

   ```
   https://tvojemeno.github.io/churchTextApp/
   ```

**D2. Vytvor si ikonu na ploche**

1. V Chrome ťukni vpravo hore na **⋮** (tri bodky).
2. Zvoľ **Pridať na plochu** (alebo *Nainštalovať aplikáciu*).
3. Potvrď. Na ploche tabletu pribudne ikona **Organista** a aplikácia sa bude
   otvárať na celú obrazovku ako bežná aplikácia. Odteraz spúšťaj appku touto
   ikonou.

**D3. Vlož Application ID**

1. V aplikácii ťukni hore na **Nastavenia**.
2. V časti **Chromecast** je políčko *Application ID prijímača*.
3. Napíš doň kód z časti B4 (napr. `A1B2C3D4`) a ťukni mimo políčka.
   Objaví sa potvrdenie *Cast Application ID uložené*.

> Pred zadaním kódu je hore v lište napísané *Chromecast: nenastavený* a tlačidlo
> sa volá **Nastaviť Cast**. Po zadaní kódu sa z neho stane
> **Pripojiť Chromecast** – podľa toho hneď vidíš, že sa kód uložil.

**D4. Prvé pripojenie k televízoru**

1. Zapni televízor a prepni ho na vstup, kde je Chromecast (tlačidlo *Source* /
   *Input* na diaľkovom ovládači → *HDMI 1*, *HDMI 2*…). Na obrazovke by mala byť
   uvítacia obrazovka Chromecastu s názvom zariadenia.
2. V aplikácii na tablete ťukni hore na **Pripojiť Chromecast**.
3. Zobrazí sa zoznam zariadení – vyber svoj Chromecast.
4. Televízor prepne na čiernu obrazovku a v aplikácii sa vedľa tlačidla zobrazí
   zelené **Chromecast: (názov zariadenia)**.

**✅ Kontrola:** televízor je čierny a v tablete svieti zelený nápis. Hotovo –
prepojenie funguje. Text sa objaví hneď, ako spustíš premietanie piesne (časť 5).

---

### E. Načítanie piesní

Aplikácia číta súbory `.xml`. Jeden súbor = jedna pieseň (alebo aj viac piesní).

**E1. Priprav si priečinok s piesňami**

Na počítači si vytvor priečinok, napríklad `piesne`, a v ňom podpriečinky podľa
zbierok:

```
piesne/
├── JKS/          ← sem daj piesne z Jednotného katolíckeho spevníka
├── LS/           ← sem piesne z Liturgického spevníka
└── Vlastne/      ← ostatné piesne bez čísla
```

Podpriečinok sa v aplikácii stane **zbierkou**. Priečinok pomenovaný `JKS`
automaticky dostane číslovanie JKS, priečinok `LS` číslovanie LS.

Ako majú súbory vyzerať, je popísané v časti [8](#8-piesne-zo-súborov-xml).

**E2. Prenes priečinok do tabletu**

Káblom z počítača do tabletu, cez Google Drive, cez e-mail alebo na USB kľúči –
ako ti to vyhovuje. Ulož ho napríklad do priečinka *Stiahnuté súbory*.

**E3. Načítaj piesne do aplikácie**

1. V aplikácii ťukni na **Knižnica**.
2. Vľavo dole ťukni na **Načítať priečinok** a vyber priečinok `piesne`.
3. Potvrď prípadnú otázku prehliadača o prístupe k súborom.
4. Piesne sa objavia v zozname a **zostanú uložené v tablete** – pri ďalšom
   spustení ich už netreba načítavať znova. Aj bez internetu.

> Chceš si to najprv len vyskúšať? V *Nastaveniach* je tlačidlo
> **Načítať ukážkové piesne**, ktoré pridá niekoľko vzorových piesní.
>
> Piesne nemusíš mať pripravené v súboroch – napísať ich vieš priamo v tablete,
> pozri časť [7](#7-písanie-a-úprava-piesní-v-aplikácii).

**✅ Kontrola:** v knižnici vidíš zoznam piesní a vľavo zbierky (JKS, LS…).
Do políčka hľadania napíš `342` – ak máš pieseň s týmto číslom, hneď sa zobrazí.

---

## 4. Čo robiť na televízore (Android TV, Chromecast, PC)

Toto je najčastejšia otázka, preto krátko a jasne:

### Na televízore sa **nič neinštaluje a nič nenastavuje**.

Televízor len zobrazuje to, čo mu pošle Chromecast. Celé nastavenie sa robí
na tablete a na počítači.

**Ak máš Chromecast (krabičku v HDMI):**

1. Zapoj Chromecast do HDMI a do napájania (USB alebo zásuvka).
2. Raz ho nastav v aplikácii **Google Home** v tablete (pripojenie na Wi-Fi) –
   ak už funguje na púšťanie videí, máš hotovo.
3. Pred omšou len zapni televízor a prepni ho na správny HDMI vstup.

**Ak máš televízor s Android TV / Google TV (alebo Chromecast built-in):**

1. Nič sa nekupuje ani neinštaluje – Chromecast je v televízore zabudovaný.
2. Televízor musí byť na **rovnakej Wi-Fi** ako tablet.
3. Pred omšou nechaj televízor na domovskej obrazovke. Keď sa tablet pripojí,
   televízor sa sám prepne na text piesne.
4. **Neinštaluj na televízor žiadny prehliadač** – nie je potrebný.

**Ak nemáš Chromecast, ale pri televízore je počítač:**

1. Počítač pripoj k televízoru **HDMI káblom**.
2. Na počítači otvor rovnakú adresu aplikácie a ťukni na **Okno na TV**.
   Otvorí sa čierne okno len s textom.
3. Toto okno presuň na televízor a daj ho na celú obrazovku (tlačidlo ⛶
   alebo kláves `F`).
4. Piesne ovládaj **v tom istom počítači** v pôvodnom okne. Tablet vtedy
   netreba. Podrobnosti sú v časti [10](#10-verzia-bez-poplatku-náhradné-riešenie).

**Čo uvidíš na televízore, keď to funguje:**

- Po pripojení: **čierna obrazovka** (to je správne – text ešte nebeží).
- Po spustení piesne: veľký biely text na čiernom pozadí, hore vľavo číslo
  a názov piesne, dole vpravo číslo slohy.
- Po stlačení **ČIERNA OBRAZOVKA**: úplne čierny televízor, ale vybraná sloha
  sa nestratí – po opätovnom stlačení sa vráti presne tá istá.

---

## 5. Každá omša: tri kroky

Keď je všetko raz nastavené, pred každou omšou stačí:

**1. Zapni televízor a pripoj sa (asi 20 sekúnd)**

- Zapni televízor, prepni na vstup s Chromecastom.
- Na tablete otvor ikonu **Organista** → ťukni **Pripojiť Chromecast** → vyber
  zariadenie. Televízor sčernie, v tablete svieti zelený nápis.

**2. Priprav si set piesní**

- Ťukni na **Set**.
- Do políčka *Rýchle pridanie podľa čísla JKS/LS alebo názvu* napíš číslo piesne
  (napr. `342`) a stlač Enter. Pieseň pribudne do zoznamu. Takto pridaj všetky
  piesne na omšu.
- Šípkami ▲▼ vieš poradie zmeniť, krížikom pieseň odobrať.
- Hore napíš názov (napr. `Nedeľa 10:30`) a ťukni **Uložiť set** – nabudúce ho
  otvoríš jedným ťuknutím.

**3. Premietaj**

- Ťukni na **▶ Spustiť premietanie**.
- Text prvej slohy sa objaví na televízore a ty ovládaš všetko veľkými
  tlačidlami (pozri ďalšiu časť).

> Ak kňaz ohlási pieseň, ktorú nemáš v sete: ťukni na **Rýchly výber čísla**,
> na veľkej číselnej klávesnici zadaj číslo a ťukni na nájdenú pieseň. Vloží sa
> hneď za práve hranú a po jej skončení sa pokračuje podľa setu.

---

## 6. Ovládanie počas premietania

| Čo chceš urobiť | Tlačidlo na tablete | Klávesa (bluetooth pedál) |
|---|---|---|
| Ďalšia sloha | veľké **ĎALŠIA SLOHA** vpravo dole | `→`, medzerník |
| Predošlá sloha | veľké **PREDOŠLÁ SLOHA** vľavo dole | `←` |
| Skočiť na konkrétnu slohu | číselné tlačidlá vpravo (1, 2, R, 3…) | `1`–`9`, refrén `0` |
| Zhasnúť text na TV | veľké **ČIERNA OBRAZOVKA** v strede | `B` |
| Ďalšia / predošlá pieseň | tlačidlá pod náhľadom | `↓` / `↑` |
| Pieseň mimo setu | **Rýchly výber čísla** hore | – |
| Skončiť premietanie | **← Späť** hore vľavo | – |

Ďalšie užitočné veci:

- **Náhľad**: v ľavej časti obrazovky stále vidíš presne to, čo je v danej chvíli
  na televízore. Nemusíš sa otáčať.
- **Čierna obrazovka nezruší výber slohy.** Hodí sa medzi slohami, počas kázne
  alebo pri premenení – po vypnutí pokračuješ presne tam, kde si skončil.
- **Refrén** má na tlačidle písmeno `R`.
- Na konci poslednej slohy ťa tlačidlo *ĎALŠIA SLOHA* automaticky prenesie
  na ďalšiu pieseň v sete.
- V *Nastaveniach* si vieš zmeniť veľkosť písma, riadkovanie, farebnú tému
  (biely text na čiernom / opačne) a vypnúť zobrazovanie názvu piesne.

---

## 7. Písanie a úprava piesní v aplikácii

Piesne nemusíš pripravovať v počítači – napísať a opraviť ich vieš priamo v tablete
a **žiadne XML pritom nevidíš**. Každá uložená pieseň sa hneď objaví v knižnici,
dá sa vyhľadať podľa čísla aj názvu a funguje aj bez internetu.

### Napísať novú pieseň

1. V **Knižnici** ťukni vľavo dole na **✎ Nová pieseň**.
2. Vyplň **názov** piesne (jediný povinný údaj).
3. Vyber **zbierku** (napr. `JKS`, `Vlastné`, alebo si cez *+ nová zbierka…*
   vytvor ďalšiu).
4. Ak má pieseň číslo v spevníku, vyber **spevník** (JKS alebo LS) a napíš **číslo**.
   Vďaka tomu ju potom počas omše vyvoláš len zadaním čísla.
5. Píš text – **každý spievaný riadok na samostatný riadok**. Ako to bude vyzerať
   na televízore, vidíš okamžite v **náhľade vpravo**.
6. Ďalšie časti pridáš tlačidlami **+ Pridať slohu** a **+ Pridať refrén**.
7. Ťukni na **Uložiť pieseň**. Hotovo – pieseň je v knižnici.

### Vložiť celý text naraz (najrýchlejší spôsob)

Ak máš text piesne skopírovaný odinakiaľ, nemusíš ho rozdeľovať ručne:

1. Ťukni na **Vložiť celý text naraz**.
2. Vlož celý text piesne.
3. Ťukni na **Nahradiť všetky slohy** (alebo *Pridať k slohám*).

Aplikácia text sama rozdelí podľa týchto pravidiel:

| V texte | Výsledok |
|---|---|
| **prázdny riadok** medzi časťami | rozdelí text na jednotlivé slohy |
| riadok začínajúci `R:` alebo `Refrén:` | označí časť ako refrén |
| `1.`, `2)` na začiatku slohy | použije sa ako číslo slohy a z textu sa odstráni |

### Upraviť alebo zmazať pieseň

- V knižnici ťukni pri piesni na **✎**, alebo si pieseň otvor a zvoľ **✎ Upraviť**.
- Funguje to aj pri piesňach načítaných zo súborov – oprava preklepu je otázka
  niekoľkých sekúnd.
- Slohy vieš presúvať (**▲ ▼**), duplikovať (**⧉**) a mazať (**✕**).
- **Zmazať** odstráni celú pieseň z knižnice (appka sa najprv spýta).

### Na čo si dať pozor

- **Rozpísaná pieseň sa nestratí.** Keď appku zavrieš bez uloženia, pri ďalšom
  otvorení editora ponúkne *Obnoviť*. Pri odchode z editora sa navyše vždy spýta,
  či naozaj chceš odísť bez uloženia.
- Ak zadáš **číslo, ktoré už iná pieseň má**, aplikácia ťa upozorní – uložiť to
  však dovolí (napr. pri dvoch verziách tej istej piesne).
- **Stiahnuť XML** uloží pieseň ako súbor do tabletu. Hodí sa na zálohu alebo
  na prenos do iného zariadenia. Knižnica je uložená v tablete, takže pri väčšom
  množstve vlastných piesní sa oplatí občas si ich takto odložiť.

---

## 8. Piesne zo súborov XML

Súbory XML sú užitočné, keď máš piesne už niekde pripravené alebo ich chceš
hromadne preniesť. Ak chceš pieseň len napísať alebo opraviť, jednoduchšia je
cesta cez [editor v aplikácii](#7-písanie-a-úprava-piesní-v-aplikácii).

Najjednoduchší súbor piesne vyzerá takto (otvor si Poznámkový blok, napíš to
a ulož ako `342-O_Boze_nas.xml`, pričom v možnosti *Kódovanie* zvoľ **UTF-8**):

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
    <sloha cislo="2">Keď deň sa končí a tichne chrám,
zostávaš s nami, Pane, tu sám.</sloha>
  </slohy>
</piesen>
```

Pravidlá, ktoré sa oplatí poznať:

- **Každý riadok textu = jeden riadok na televízore.** Rozdeľ text tak, ako sa
  spieva, nie do jedného dlhého odseku.
- `<cislo typ="JKS">342</cislo>` – vďaka tomu vieš pieseň vyvolať zadaním `342`.
  Namiesto `JKS` môže byť `LS`.
- Ak číslo v súbore nie je, aplikácia ho skúsi prečítať z názvu súboru
  (`342 - Nazov.xml`, `JKS_342.xml`).
- Diakritika funguje, len súbor musí byť uložený v kódovaní **UTF-8**.
- Znaky `&`, `<` a `>` sa v texte píšu ako `&amp;`, `&lt;`, `&gt;`.

Aplikácia prečíta aj súbory z programov **OpenSong** a **OpenLP/OpenLyrics**, takže
ak už máš piesne v niektorom z nich, stačí ich nakopírovať.

Podrobný popis všetkých možností je v [docs/format-xml.md](docs/format-xml.md).
Ukážkové súbory nájdeš v priečinku [songs/](songs).

---

## 9. Keď niečo nefunguje

| Problém | Čo s tým |
|---|---|
| **Tlačidlo *Pripojiť Chromecast* nenájde žiadne zariadenie** | Sú tablet aj Chromecast na tej istej Wi-Fi? Používaš prehliadač **Chrome**? Skús v tablete zapnúť *Polohu* (Android ju niekedy vyžaduje na nájdenie zariadení v sieti) a zapnúť/vypnúť Wi-Fi. |
| **Pripojím sa, ale televízor ostane na uvítacej obrazovke Chromecastu** | Najčastejšie ešte neprešlo 15 minút od registrácie zariadenia (časť C), alebo Chromecast nebol reštartovaný. Vytiahni ho z napájania na 10 sekúnd a skús znova. |
| **Televízor je čierny a text sa neobjaví ani po spustení piesne** | Čierna obrazovka hneď po pripojení je správna. Ťukni na **▶ Spustiť premietanie** alebo skontroluj, či nie je zapnutá **ČIERNA OBRAZOVKA** (tlačidlo svieti načerveno). |
| **Televízor píše chybu alebo ostane prázdny aj po spustení piesne** | Otvor v počítači adresu `https://…/receiver.html`. Musí sa zobraziť čierna stránka. Ak je chyba 404, GitHub Pages nie je správne zapnutý (časť A3) alebo je v konzole zle napísaná adresa (časť B3). |
| **V konzole som sa pomýlil v adrese prijímača** | Na [cast.google.com/publish](https://cast.google.com/publish) otvor svoju aplikáciu, adresu oprav a ulož. Application ID ostáva rovnaké. Potom reštartuj Chromecast. |
| **Zmenil som súbory na GitHube, ale televízor ukazuje staré** | Chromecast si stránku pamätá. Odpoj sa, vytiahni Chromecast z napájania na 10 sekúnd a pripoj sa znova. |
| **Text je na televízore primalý / priveľký** | *Nastavenia → Vzhľad premietania → Veľkosť písma*. Aplikácia veľkosť dopočítava sama, týmto ju len doladíš. |
| **Tablet počas omše zhasne** | *Nastavenia → Nezhasínať tablet počas premietania*. A maj tablet v nabíjačke. |
| **Piesne zmizli** | Ak si v prehliadači zmazal údaje stránok, knižnica sa vymaže. Načítaj priečinok znova (časť E3). Preto si priečinok s piesňami odlož aj mimo tabletu. |
| **Aplikácia sa v kostole nenačíta (slabý internet)** | Otvor ju aspoň raz doma cez ikonu na ploche – uloží sa do tabletu a funguje aj offline. Samotné pripojenie na Chromecast však internet v kostole potrebuje. |

---

## 10. Verzia bez poplatku (náhradné riešenie)

Ak nechceš platiť 5 USD alebo zatiaľ čakáš na registráciu, text sa dá na televízor
dostať aj takto – bez Chromecastu a bez registrácie:

**Cez HDMI kábel z notebooku (najistejšie):**

1. Notebook pripoj k televízoru HDMI káblom.
2. Otvor aplikáciu (adresu z časti A, alebo priamo súbor `index.html`
   cez `npm start`, pozri časť 10).
3. Ťukni na **Okno na TV** – otvorí sa čierne okno len s textom.
4. Okno presuň na obrazovku televízora a stlač ⛶ (alebo kláves `F`) pre
   celú obrazovku.
5. Piesne ovládaj v pôvodnom okne na notebooku.

**Cez prenos karty v Chrome (ak máš Chromecast, ale bez registrácie):**

1. Na **počítači** otvor aplikáciu a klikni na **Okno na TV**.
2. V Chrome klikni na **⋮ → Prenášať…** → dole zvoľ *Zdroje: **Prenos karty*** →
   vyber Chromecast.
3. Na televízore bude len okno s textom, ovládanie ostáva na počítači.

Rozdiel oproti platenej verzii: ovládanie musí bežať na tom istom počítači ako
premietacie okno, takže tablet v tomto prípade nevyužiješ.

---

## 11. Pre technicky zdatných

```bash
npm start     # spustí aplikáciu na http://localhost:8080
npm test      # testy parsera XML
```

Aplikácia je čisto statická (HTML + JavaScript, žiadny build). Dá sa nahrať na
ľubovoľný hosting s HTTPS, nielen na GitHub Pages. Údaje sú v IndexedDB v tablete.

```
index.html        ovládanie (tablet)
display.html      premietacie okno (HDMI / prenos karty)
receiver.html     stránka, ktorú si stiahne Chromecast
js/xmlparse.js    minimálny XML parser bez závislostí
js/songs.js       rozpoznanie formátov, čísla JKS/LS, vyhľadávanie
js/store.js       IndexedDB (piesne, zbierky, sety) + nastavenia
js/import.js      načítanie priečinka so súbormi
js/editor.js      editor piesní (formulár, rozdelenie textu, export XML)
js/bus.js         prenos stavu na obrazovky
js/display-core.js vykreslenie textu + automatická veľkosť písma
js/cast.js        Google Cast (odosielanie)
js/app.js         rozhranie a živý režim
```

Komunikácia s prijímačom ide cez vlastný Cast kanál
`urn:x-cast:sk.organista.texty`; posiela sa JSON so slohou, názvom, číslom
a nastaveniami vzhľadu. Prijímač (`receiver.html`) má vypnutý časový limit
nečinnosti, aby počas omše nezhasol.
