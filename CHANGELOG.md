# Zoznam zmien

Popisy jednotlivých verzií aplikácie. Text pod nadpisom verzie sa automaticky
použije ako popis vydania na GitHube.

## 1.1.0

**Responzóriový žalm z liturgického kalendára**

- Nové tlačidlo **📖 Žalm na dnes** v knižnici stiahne responzóriový žalm
  z liturgického kalendára KBS (`lc.kbs.sk`) a pripraví ho na premietanie.
- Deň sa vyberá tlačidlami **Dnes / Zajtra / Najbližšia nedeľa** alebo dátumom.
- Premieta sa **refrén označený `R.:`**, ktorý je na stránke nad nadpisom
  *Responzóriový žalm*; do textu sa berie aj samotná značka `R.:`.
- Žalm sa dá buď **premietať jednorázovo** (nikam sa neukladá), alebo
  **uložiť do novej zbierky Žalmy** s názvom podľa dátumu a sviatku.
- Ak má deň viac formulárov, všetky nájdené žalmy sa uložia ako jedna pieseň
  a každý žalm je samostatná sloha.
- Ak sa žalm nenájde, dá sa zobraziť načítaný text stránky na kontrolu.

**Ostatné**

- Aplikácia má po novom povolenie na **internet**. Používa ho výhradne na
  stiahnutie žalmu z `lc.kbs.sk`; piesne a sety zostávajú v tablete.
- Vo vydaniach na GitHube zostávajú všetky staršie verzie: každá má vlastné
  vydanie `v1.x.y`, ktoré sa už neprepisuje.

## 1.0.1

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

## 1.0.0

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
