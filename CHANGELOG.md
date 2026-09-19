# Zoznam zmien

Popisy jednotlivých verzií aplikácie. Text pod nadpisom verzie sa automaticky
použije ako popis vydania na GitHube.

Aplikácia je zatiaľ v **alfa verzii**, preto majú všetky vydania číslo
`a0.x.y` – písmeno `a` znamená *alfa* (skúšobná verzia, nie všetko funguje
spoľahlivo). Pôvodné čísla `1.0.0` – `1.1.1` sa premenovali takto:
`1.0.0 → a0.0.0`, `1.0.1 → a0.0.1`, `1.1.0 → a0.1.0`, `1.1.1 → a0.1.1`.
Číslo `1.0.0` dostane až prvá verzia, ktorá bude na bežné používanie v kostole
overená.

## a0.1.5

**Priečinok s piesňami bez pýtania**

- **Po inštalácii sa aplikácia už nepýta, kde má piesne ukladať.** Rovno
  používa priečinok `Stiahnuté/Organista/piesne` a načíta ho pri spustení.
  Stačí jej raz zapnúť **prístup k súborom** (*Nastavenia → Priečinok
  s piesňami → Povoliť prístup k súborom*); Android inak aplikácii do
  bežných priečinkov nevidí.
- **Priečinok sa dá zmeniť** v *Nastavenia → Priečinok s piesňami →
  Zmeniť priečinok*. Celý obsah toho starého sa do nového presunie.

**Premietanie**

- Namiesto dvoch náhľadov sú pod sebou **obrazovky jednotlivých slôh** tak,
  ako budú vyzerať na televízore. Ťuknutím na slohu ju premietneš a práve
  premietaná má **červený rámik**. Výber slôh číslami vpravo aj veľké
  tlačidlá dole zostali bez zmeny.
- Nové tlačidlo **✎ Upraviť** priamo v premietaní: keď v texte nájdeš chybu,
  hneď ju opravíš a uloží sa natrvalo. Po uložení sa vrátiš tam, kde si bol.
- **Rýchly výber čísla už neuteká.** Nájdené piesne sú nad klávesnicou
  a majú stálu výšku, takže sa tlačidlá pri písaní nehýbu.

## a0.1.4

**Priečinok s piesňami je úložisko**

- **Piesne sa načítajú pri každom spustení** z priečinka
  `Stiahnuté/Organista/piesne` – s ukazovateľom priebehu, takže vidno, koľko
  toho ešte zostáva. Tlačidlo na načítanie už teda netreba; zostalo len malé
  **↻ Znovu načítať priečinok**, keď do neho niečo pribudne počas behu
  aplikácie.
- **Nová pieseň z aplikácie sa doň uloží sama**, do podpriečinka podľa svojej
  zbierky. Ak zbierka priečinok ešte nemá, vytvorí sa. To isté platí pre
  uložený žalm.
- **Zmazanie piesne alebo zbierky zmaže aj súbor** v priečinku – inak by sa
  pri ďalšom spustení vrátili. Mazanie celej knižnice na to upozorní.
- Piesne, ktoré v priečinku ešte súbor nemajú (napríklad písané v aplikácii
  predtým), sa doň po prvom načítaní dopíšu.

**Veľkosť textu na obrazovke**

- **Na televízore bolo vidieť menej riadkov než v náhľade.** Android na veľkej
  obrazovke sám zväčšoval písmo a spodok textu potom vytiekol mimo plochu.
  Toto zväčšovanie je vypnuté a veľkosť sa navyše po vykreslení ešte overí,
  takže náhľad a televízor ukazujú to isté.
- **Text sa roztiahne tak, aby zaplnil čo najviac obrazovky** a zostalo čo
  najmenej čiernej plochy. Riadkovanie zo súboru sa zachováva; riadok sa
  rozdelí, až keď by kvôli nemu bolo písmo pod nastavenou hranicou.
- Nové nastavenia **Najmenšie písmo** a **Najväčšie písmo** (v % výšky plochy
  s textom). *Najmenšie* rozhoduje, kedy sa riadok radšej rozdelí,
  *najväčšie* drží na uzde krátke slohy, aby jedno slovo nezaplnilo celú
  obrazovku.

**Známe chyby (opravené vo verzii a0.1.5)**

- **Pri prvom spustení sa aplikácia pýtala, ktorý priečinok má používať** –
  namiesto toho, aby rovno použila ten predvolený.
- **V rýchlom výbere čísla počas premietania utekala klávesnica**: len čo sa
  pod ňou objavili nájdené piesne, tlačidlá sa posunuli a ťukalo sa vedľa.

## a0.1.3

**Obraz na televízore**

- **Prelínanie už nezamrzne v polovici.** Okno na druhej obrazovke sa
  prekresľovalo len raz po zmene textu, takže sloha zostala viditeľná na
  polovicu a čierna obrazovka nechala na televízore presvitať text. Teraz sa
  okno prekresľuje počas celého prelínania a na jeho konci sa text natvrdo
  prepne na plnú viditeľnosť.
- **Hlásenia „Pripájam sa k tabletu…“ a „Server nedostupný“ už na televízore
  nezostávajú.** Druhá obrazovka v aplikácii pre Android o sebe vie (otvára sa
  s `?rezim=tv`), takže sa nepokúša spájať so serverom, a akýkoľvek stav
  z tabletu – aj čierna obrazovka – hlásenie schová.
- **Odchod z premietania zhasne televízor okamžite.** Predtým čierna obrazovka
  naskočila až po prechode do knižnice. Po návrate do premietania sa text
  objaví, až keď ho sám zapneš.

**Piesne z počítača**

- Aplikácia si sama vytvorí priečinok **`Stiahnuté/Organista/piesne`**, ktorý je
  z počítača bežne vidieť (*Tablet → Interná pamäť → Download → Organista →
  piesne*). Je v ňom aj súbor `PRECITAJ-MA.txt` s návodom, takže sa dá spoznať
  na prvý pohľad.
- V knižnici pribudlo tlačidlo **⬇ Načítať piesne z tabletu** – načíta všetko
  z tohto priečinka vrátane podpriečinkov, z ktorých sa stanú zbierky.
  Android sa iba prvýkrát spýta na povolenie („Použiť tento priečinok“),
  potom už stačí jedno ťuknutie.
- Systémový výber priečinka sa otvára rovno v tomto priečinku, takže ho netreba
  hľadať. *Načítať priečinok* a *Načítať súbory* fungujú ako doteraz.

**Známe chyby (opravené vo verzii a0.1.4)**

- **Na televízore sa zobrazovalo menej riadkov než v náhľade na tablete** –
  spodné riadky slohy chýbali, lebo Android na druhej obrazovke sám zväčšoval
  písmo a text vytiekol mimo plochu.
- **Piesne z priečinka sa načítavali len po ťuknutí na tlačidlo** a piesne
  napísané v aplikácii sa doň neukladali, takže priečinok a knižnica sa
  rozchádzali.

**Zálohy**

- **Záloha si pamätá zbierky.** Ku každej piesni sa ukladá aj zbierka
  a pôvodný názov súboru, takže po obnove sú piesne späť v *JKS*, *Žalmy*
  a ostatných zbierkach – nie všetky v jednej kope. Piesne si zachovajú aj
  svoje identifikátory, takže **uložené sety zostanú funkčné**.
- **Prázdna knižnica sa pri spustení obnoví sama** z poslednej automatickej
  zálohy v `Stiahnuté/Organista/autosave/`. Po ručnej aktualizácii aplikácie
  (odinštalovanie a nová inštalácia) tak piesne netreba nahrávať znova.
- Staršie zálohy, ktoré zbierku v sebe nemajú, sa načítajú do zbierky
  *Ostatné* – tie treba prípadne roztriediť ručne.

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

**Známe chyby (opravené vo verzii a0.1.3)**

- **Prelínanie na televízore zamŕzalo v polovici.** Text sa objavil len
  spolovice viditeľný a takto zostal až do ďalšieho stlačenia; pri čiernej
  obrazovke na televízore presvital text a po jej vypnutí čierna preblikla
  a text sa vrátil opäť polovičný.
- **Na televízore zostávali hlásenia** „Pripájam sa k tabletu…“ a „Server
  nedostupný“, aj keď premietanie bežalo.
- **Po odchode z premietania sa televízor nezhasol** hneď, ale až po prechode
  do knižnice.

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
