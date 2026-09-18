# Zoznam zmien

Popisy jednotlivých verzií aplikácie. Text pod nadpisom verzie sa automaticky
použije ako popis vydania na GitHube.

Aplikácia je zatiaľ v **alfa verzii**, preto majú všetky vydania číslo
`a0.x.y` – písmeno `a` znamená *alfa* (skúšobná verzia, nie všetko funguje
spoľahlivo). Pôvodné čísla `1.0.0` – `1.1.1` sa premenovali takto:
`1.0.0 → a0.0.0`, `1.0.1 → a0.0.1`, `1.1.0 → a0.1.0`, `1.1.1 → a0.1.1`.
Číslo `1.0.0` dostane až prvá verzia, ktorá bude na bežné používanie v kostole
overená.

## a0.1.2

**Premietanie na televízore už nezaostáva**

- **Sloha aj čierna obrazovka sa na televízore zmenia hneď.** Predtým sa obraz
  menil až pri ďalšom stlačení, takže televízor ukazoval stále o krok staršiu
  slohu než tablet – a čierna obrazovka naskočila až vtedy, keď si ju už chcel
  vypnúť.
- Prelínanie zostalo zachované, ale nový text sa najprv vypíše a až potom
  rozsvieti. Premietanie sa tak neoneskorí ani pri rýchlom prepínaní slôh.
- Na obrazovku sa už nedostane staršia správa, ktorá dorazí neskoro:
  každá nesie čas odoslania a zastarané sa zahodia.
- V aplikácii pre Android ide stav na druhú obrazovku už len natívne, bez
  druhej, pomalšej cesty, ktorá obraz vracala späť.

**Set**

- **Zelené tlačidlo „✓ V sete“ pieseň zo setu odoberie.** Predtým sa nedalo
  stlačiť. Rovnako sa správa aj tlačidlo v okne s náhľadom piesne.

## a0.1.1

**Opravy načítania žalmu**

- **Refrén sa berie z úvodu stránky**, spomedzi súradníc s čítaniami – teda
  z riadka označeného `R.:`. Predtým sa hľadal až pri texte žalmu a bral sa
  nesprávny riadok.
- **„alebo Aleluja“ za refrénom sa už nepremieta** – z textu sa odreže.
- **Viac žalmov v jeden deň** (viac formulárov) sa načíta správne; každý je
  samostatná sloha jednej piesne. Opakovanie refrénu v texte žalmu už
  nevytvorí ďalšiu slohu.
- **Názov uloženého žalmu** je dátum a názov dňa so sviatkom, napríklad
  *17. 9. 2026 – štvrtok 24. týždňa v Cezročnom období, Sv. Kornélia…*.
  Meniny sa do názvu nedostanú ani vtedy, keď sú na tom istom riadku ako deň
  (*„17. september 2026 - štvrtok, meniny: …“*), a dátum tam už nie je dvakrát.

**Rozhranie**

- **Dva náhľady v premietaní**: vľavo *Vybraná sloha* (text vidíš aj počas
  čiernej obrazovky), vpravo *Na televízore* (skutočný obraz). Oba majú pomer
  strán ako televízor.
- **Aplikácia sa už neposúva do strán** – knižnica aj set sa zmestia na šírku
  tabletu.
- Uložené sety majú **vlastné okno** (tlačidlo **📂 Uložené sety**), takže pri
  väčšom počte neprekrývajú zoznam piesní v pripravovanom sete.
- **Ukladanie setu**: rovnaký názov sa najprv spýta, či pôvodný set prepísať;
  zmenený názov uloží nový set a pôvodný nechá na pokoji. Tlačidlo *Nový* sa
  premenovalo na **Vyprázdniť** – maže len rozpracovaný set.
- Bočný panel má **oddeľovaciu čiaru** medzi zbierkami a tlačidlami.

**Zálohovanie a aktualizácia**

- **Automatická záloha** knižnice do `Stiahnuté/Organista/autosave/` – pri
  každom spustení aplikácie a potom každých 20 minút. Vždy prepíše
  predchádzajúcu, takže nezaberá viac miesta.
- **Kontrola novej verzie** priamo v aplikácii: *Nastavenia → Aktualizácia
  aplikácie → Skontrolovať novú verziu*. Porovná verziu s vydaniami na GitHube,
  stiahne novú a otvorí inštalátor. Pred inštaláciou sa uloží záloha knižnice.
  Aktualizácia nemaže piesne ani sety.
- Aby sa dala aplikácia aktualizovať bez odinštalovania, musí byť podpísaná
  stále rovnakým kľúčom – postup je v README v časti *Vlastný podpisovací kľúč*.

**Číslovanie verzií**

- Všetky doterajšie verzie sa premenovali na **alfa verzie** `a0.x.y`, pretože
  aplikácia ešte nie je odskúšaná natoľko, aby sa dala označiť za hotovú.
  Táto verzia je teda `a0.1.1` (predtým `1.1.1`).
- Vydania na GitHube majú po novom značku `a0.x.y` (predtým `v1.x.y`).
- Táto jedna verzia sa musí do tabletu stiahnuť ručne; kontrola novej verzie
  v aplikácii totiž v staršej inštalácii porovnáva ešte staré číslo. Ďalšie
  aktualizácie už tlačidlo v nastaveniach nájde samo.

**Známa chyba (opravená vo verzii a0.1.2)**

- Premietanie na televízore bolo **o krok pozadu**: po prepnutí slohy zostal na
  televízore text predchádzajúcej slohy a nová sa objavila až pri ďalšom
  stlačení. To isté platilo pre čiernu obrazovku – zapla sa až o krok neskôr.
  Na tablete bol pritom náhľad vždy správny.

## a0.1.0

**Responzóriový žalm z liturgického kalendára**

- Nové tlačidlo **📖 Žalm na dnes** v knižnici stiahne responzóriový žalm
  z liturgického kalendára KBS (`lc.kbs.sk`) a pripraví ho na premietanie.
- Deň sa vyberá tlačidlami **Dnes / Zajtra / Najbližšia nedeľa** alebo dátumom.
- Premieta sa **refrén označený `R.:`**, ktorý je na stránke nad nadpisom
  *Responzóriový žalm*; do textu sa berie aj samotná značka `R.:`.
- Žalm sa dá buď **premietať jednorázovo** (nikam sa neukladá), alebo
  **uložiť do novej zbierky Žalmy** ~~s názvom podľa dátumu a sviatku.~~
  (zatiaľ zle parsuje názvy dní a sviatkov, iba dátumy sú správne,
  oprava v novej verzii)
- ~~Ak má deň viac formulárov, všetky nájdené žalmy sa uložia ako jedna pieseň
  a každý žalm je samostatná sloha.~~ (zatiaľ nefunkčné, nenačíta žalm vôbec,
  oprava v novej verzii)
- Ak sa žalm nenájde, dá sa zobraziť načítaný text stránky na kontrolu.

**Ostatné**

- Aplikácia má po novom povolenie na **internet**. Používa ho výhradne na
  stiahnutie žalmu z `lc.kbs.sk`; piesne a sety zostávajú v tablete.
- Vo vydaniach na GitHube zostávajú všetky staršie verzie: každá má vlastné
  vydanie `v1.x.y`, ktoré sa už neprepisuje.

## a0.0.1

**Vzhľad premietania**

- Premietanie sa spúšťa s **čiernou obrazovkou** – text sa objaví až na
  stlačenie tlačidla. Dá sa vypnúť v nastaveniach.
- **Prelínanie** pri zmene slohy aj pri čiernej obrazovke, nastaviteľné:
  vypnuté / jemné / stredné / pomalé.
- Nové nastavenie **číslo slohy pred textom** („1. Ó, Bože náš…“, „R: …“).
- **Hlavička na televízore** sa dá prepnúť na číslo aj názov piesne, len číslo,
  len názov, alebo nič. Nahrádza pôvodný prepínač; staré nastavenie sa prenesie.

**Opravy**

- Druhá obrazovka sa v aplikácii pre Android už nepokúša pripájať na server,
  ktorý tam neexistuje.
- Do APK sa pribalila ikona aplikácie (predtým bol v hlavičke rozbitý obrázok).

**Návod**

- Presné cesty k dátam v tablete a postup, ako nahrať piesne z počítača.
- Nová časť o testovaní druhej obrazovky bez televízora.

## a0.0.0

**Prvá verzia aplikácie pre Android**

- Natívna aplikácia (Kotlin) zabalená do `.apk`; rozhranie je spoločné
  s verziou pre prehliadač.
- **Druhá obrazovka**: keď Android ohlási externý displej – HDMI, bezdrôtový
  displej alebo zrkadlenie obrazovky na Chromecast – aplikácia na ňom sama
  spustí premietanie a na tablete zostane ovládanie.
- **Úložisko v tablete**: piesne, zbierky a sety v súkromnom priečinku
  aplikácie, s dvojfázovým zápisom a zálohou predchádzajúcej verzie.
- **Import celého priečinka** s piesňami cez systémový výber, vrátane
  podpriečinkov ako zbierok; export piesne aj zálohy do `Stiahnuté/Organista`.
- Knižnica s vyhľadávaním podľa názvu aj čísla JKS/LS, sety, živý režim
  s veľkými tlačidlami, čierna obrazovka bez straty výberu slohy a editor
  piesní priamo v aplikácii.
