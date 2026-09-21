# Template canonico — scheda numismatica ILA

Due scheletri: **tipo monetale** e **gemma**. Sono sovrapponibili alle schede
epigrafiche del CMRDM I salvo i punti marcati ⬥.

---

## A. Tipo monetale

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="http://epidoc.stoa.org/schema/latest/tei-epidoc.rng"
            schematypens="http://relaxng.org/ns/structure/1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="en">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title><rs type="textType">Tipo monetale</rs> Bronzo di Juliopolis con
          Men stante, sotto Caracalla</title>
        <respStmt><resp>editor</resp><name>…</name></respStmt>
      </titleStmt>
      <publicationStmt>
        <authority>ILA — Index Lunae Antiquae</authority>
        <idno type="filename">CMRDM-II-JULIOPOLIS-9</idno>
      </publicationStmt>
      <sourceDesc>
        <msDesc>
          <msIdentifier/>                      <!-- ⬥ vuoto: un tipo non è conservato -->
          <physDesc>
            <objectDesc>
              <supportDesc>
                <support>
                  <objectType>coin type</objectType>
                  <!-- ⬥ <material> SOLO se Lane dà il metallo (quasi mai) -->
                </support>
              </supportDesc>
            </objectDesc>
          </physDesc>
          <history>
            <origin>
              <origPlace type="mint">        <!-- ⬥ @type="mint": è la zecca -->
                <placeName type="ancient">Juliopolis</placeName>
                <placeName type="region">Bithynia</placeName>
              </origPlace>
              <origDate datingMethod="#julian" notBefore-custom="0198"
                        notAfter-custom="0217" evidence="portrait">Caracalla</origDate>
            </origin>
            <!-- ⬥ nessun <provenance>: un tipo non ha luogo di rinvenimento -->
          </history>
        </msDesc>
      </sourceDesc>
    </fileDesc>
    <profileDesc>
      <textClass>
        <keywords scheme="divinita"><term>Men</term></keywords>
      </textClass>
    </profileDesc>
    <xenoData>
      <num:numismatics xmlns:num="https://ila-project.org/ns/numismatics">
        <num:mint ref="http://nomisma.org/id/juliopolis">Juliopolis</num:mint>
        <num:authority key="Caracalla"/>
        <!-- ⬥ num:metal e num:denomination: assenti da Lane, si OMETTONO -->
        <num:weight unit="g" atLeast="12.03" atMost="14.42"/>
        <num:specimen rend="illustrated">
          <num:weight unit="g">14.42</num:weight>
          <num:collection>Paris</num:collection>
        </num:specimen>
        <num:specimen>
          <num:weight unit="g">12.03</num:weight>
          <num:collection>Vienna</num:collection>
        </num:specimen>
        <num:reference corpus="CMRDM II" n="Juliopolis 9"/>
      </num:numismatics>
      <ica:iconography xmlns:ica="https://ila-project.org/ns/iconography">
        <!-- ⬥ niente <ica:function>: non si applica a un'emissione -->
        <ica:side n="obv">
          <ica:figure n="1" type="emperor" key="Caracalla" dir="right">
            <ica:trait type="portrait" key="draped_bust"/>
            <ica:trait type="portrait" key="laureate_head"/>
            <ica:trait type="feature" key="bearded"/>
          </ica:figure>
          <ica:note>Bust of Caracalla, r., bearded, laureate</ica:note>
        </ica:side>
        <ica:side n="rev">
          <ica:figure n="1" type="deity" key="Men" dir="left">
            <ica:trait type="pose" key="standing"/>
            <ica:trait type="held_object" key="patera"/>
          </ica:figure>
          <ica:figure n="2" type="symbol" key="altar" rel="below" relTo="1"/>
          <ica:note>Men standing l. with patera over altar</ica:note>
        </ica:side>
      </ica:iconography>
    </xenoData>
  </teiHeader>
  <text>
    <body>
      <div type="edition">
        <div type="textpart" subtype="face" n="obv" xml:lang="grc">
          <ab><lb n="1"/>Αὐτ. Κ. Ἀντωνῖνος Αὐγ.</ab>
        </div>
        <div type="textpart" subtype="face" n="rev" xml:lang="grc">
          <ab><lb n="1"/>Ἰουλιοπολειτῶν</ab>
        </div>
      </div>
      <div type="commentary">
        <p>It is questionable whether Men is actually intended.</p>
      </div>
      <div type="bibliography">
        <listBibl>
          <bibl>E. N. Lane, Corpus Monumentorum Religionis Dei Menis (CMRDM).
            II: The Coins and Gems, Leiden 1975, Juliopolis 9</bibl>
          <bibl>Recueil, I, 2, p. 387, n. 20</bibl>
        </listBibl>
      </div>
    </body>
  </text>
</TEI>
```

**Faccia anepigrafe** (Lane: «No inscription»):

```xml
<div type="textpart" subtype="face" n="rev" xml:lang="grc">
  <ab><space unit="side"/></ab>
</div>
```

---

## B. Gemma

Una gemma è un **oggetto unico**: torna lo scheletro del CMRDM I. Niente
`num:specimen`, niente intervalli, niente `ica:side`.

```xml
<sourceDesc>
  <msDesc>
    <msIdentifier><repository>Paris</repository></msIdentifier>
    <physDesc>
      <objectDesc>
        <supportDesc>
          <support>
            <objectType>gem</objectType>
            <dimensions>
              <height unit="mm">18</height>
              <width unit="mm">14</width>
            </dimensions>
          </support>
        </supportDesc>
      </objectDesc>
    </physDesc>
  </msDesc>
</sourceDesc>
…
<xenoData>
  <ica:iconography xmlns:ica="https://ila-project.org/ns/iconography">
    <ica:figure n="1" type="deity" key="Men" dir="facing">
      <ica:trait type="pose" key="standing"/>
      <ica:trait type="held_object" key="staff" hand="right"/>
      <ica:trait type="held_object" key="pine_cone" hand="left"/>
    </ica:figure>
    <ica:note>Men standing, head frontal, staff in right hand, pine-cone in left</ica:note>
  </ica:iconography>
</xenoData>
```

Le gemme sono quasi sempre **anepigrafi**: `<div type="edition"><ab><lb n="1"/></ab></div>`,
esattamente come i monumenti muti del CMRDM I. Mai inventare una legenda.

---

## Inventario dei tag propri di questa sezione

| Tag | Dove | Obbligatorio |
|---|---|---|
| `num:mint` | `xenoData` | sì (è la testata dell'entry) |
| `num:authority` | `xenoData` | se Lane nomina il ritratto imperiale |
| `num:metal` `@key @ref @cert` | `xenoData` | no — assente da Lane |
| `num:denomination` `@key @cert @resp` | `xenoData` | no — assente da Lane |
| `num:weight` `@unit @atLeast @atMost` | sul tipo | se ≥ 2 esemplari pesati |
| `num:weight` `@unit` + testo | in `num:specimen` | se Lane dà il peso |
| `num:diameter` `@unit` | entrambi | raro |
| `num:axis` `@unit="h"` | `num:specimen` | mai da Lane |
| `num:specimen` `@rend="illustrated" @ref` | `xenoData` | uno per pezzo citato |
| `num:collection` | in `num:specimen` | sì se c'è lo specimen |
| `num:reference` `@corpus @n` | `xenoData` | sì |
| `ica:side` `@n="obv\|rev"` | `ica:iconography` | sì sulle monete, mai sulle gemme |
| `ica:figure` `@dir @rel @relTo` | in `ica:side` | `@dir` se Lane dà l'orientamento |
| `ica:note` | per faccia | **sempre**: la prosa integrale di Lane |
