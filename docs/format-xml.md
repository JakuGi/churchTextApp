# Formát XML súborov s piesňami

Aplikácia rozpozná formát automaticky. Odporúčaný je vlastný formát nižšie,
ale čítajú sa aj súbory z programov OpenSong a OpenLP / OpenLyrics.

## 1. Vlastný formát

```xml
<?xml version="1.0" encoding="UTF-8"?>
<piesen>
  <nazov>Ó, Bože náš, k Tebe voláme</nazov>
  <cislo typ="JKS">342</cislo>
  <autor>neznámy</autor>
  <melodia>ľudová</melodia>
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

### Značky

| Značka | Význam | Povinná |
|---|---|---|
| `<nazov>` (`<title>`) | názov piesne | odporúčaná |
| `<cislo typ="JKS">` (`<number>`) | číslo v spevníku; `typ` je `JKS`, `LS`, prípadne iný | nie |
| `<autor>`, `<melodia>` | doplnkové údaje | nie |
| `<slohy>` (`<verses>`) | obal pre slohy | nie (môžu byť aj priamo v koreni) |
| `<sloha cislo="1">` (`<verse>`) | sloha; `cislo` je popisok tlačidla | áno |
| `<refren>` (`<chorus>`) | refrén – na tlačidle sa zobrazí `R` | nie |
| `<medzihra>`, `<zaver>` | ďalšie časti | nie |

Poznámky:

- Nový riadok v texte = nový riadok na premietaní. Dá sa použiť aj `<br/>`
  alebo jednotlivé `<riadok>…</riadok>`.
- Ak `cislo` pri slohe chýba, slohy sa očíslujú automaticky v poradí.
- Diakritika vyžaduje `encoding="UTF-8"`.
- Znaky `&`, `<`, `>` v texte zapíš ako `&amp;`, `&lt;`, `&gt;`,
  alebo celý text vlož do `<![CDATA[ … ]]>`.

### Viac piesní v jednom súbore

```xml
<piesne>
  <piesen>…</piesen>
  <piesen>…</piesen>
</piesne>
```

### Anglické značky

Funguje aj `<song><title>…</title><number>…</number><verses><verse>…</verse></verses></song>`.

## 2. OpenSong

```xml
<song>
  <title>Názov</title>
  <lyrics>[V1]
 prvý riadok
 druhý riadok
[C]
 refrén
</lyrics>
</song>
```

Riadky začínajúce `;` (poznámky) a `.` (akordy) sa ignorujú.

## 3. OpenLyrics / OpenLP

```xml
<song xmlns="http://openlyrics.info/namespace/2009/song">
  <properties><titles><title>Názov</title></titles></properties>
  <lyrics>
    <verse name="v1"><lines>prvý riadok<br/>druhý riadok</lines></verse>
    <verse name="c"><lines>refrén</lines></verse>
  </lyrics>
</song>
```

## Čísla JKS / LS

Číslo sa hľadá v tomto poradí:

1. značka `<cislo>` / `<number>` (typ z atribútu `typ`),
2. názov súboru – `342 - Nazov.xml`, `JKS_342.xml`, `078-Vitaj.xml`,
3. číselník priečinka nastavený v **Nastaveniach → Zbierky piesní**.

V knižnici aj v rýchlom výbere potom stačí napísať `342`, `JKS 342` alebo `LS 12`.

## Odporúčané usporiadanie priečinkov

```
piesne/
├── JKS/              → zbierka „JKS“ s číslami JKS
│   ├── 001-Prislubeny.xml
│   └── 342-O_Boze_nas.xml
├── LS/               → zbierka „LS“ s číslami LS
└── Vlastne/          → zbierka bez čísel
```
