// ═══════════════════════════════════════════════════════════════════════
// fontiLetterarie.ts — contenuto redazionale della sezione «Fonti letterarie».
// ═══════════════════════════════════════════════════════════════════════
//
// Struttura e vocabolari: vedi src/lib/litSources.ts.
// Norme redazionali e mappatura LARES: vedi docs/fonti-letterarie-modello.md.
//
// AVVERTENZA SUI TESTI. Le trascrizioni greche e latine sono state approntate
// in redazione a partire dalle edizioni indicate in `edizione`, e sono tutte
// marcate `collazione: 'da-collazionare'`: vanno riscontrate sull'edizione
// cartacea prima di essere considerate definitive. Il campo non è un
// segnaposto — è la lista di lavoro della voce, ed è esposto nell'interfaccia.
// Le traduzioni italiane sono redazionali (ILA), non riprese da traduttori
// esistenti, e possono essere sostituite senza vincoli di diritto.

import { Voce, VoceInPreparazione } from '../lib/litSources';

const ED = 'trad. redazionale ILA';

export const VOCE_SELENE: Voce = {
  id: 'ILA-LIT-selene',
  lemma: 'Selene',
  lemmaGreco: 'Σελήνη / Μήνη',
  traslitterazione: 'Selḗnē / Mḗnē',
  sottotitolo: 'la luna divinizzata nelle fonti greche e latine',

  cappello: [
    'Prima di qualunque iscrizione, la luna è una voce di lessico. Il greco la nomina con due parole — Σελήνη e Μήνη — che i testi usano come sinonimi ma che hanno storie diverse: la prima è un derivato di σέλας, «bagliore», e descrive ciò che l\'astro fa; la seconda sta accanto a μήν, «mese», e descrive ciò che l\'astro misura. Il latino ha Luna, di nuovo un nome di luce, e conosce — ma quasi solo per bocca di autori che parlano di culti stranieri — un Lunus maschile.',
    'Questa voce raccoglie le testimonianze letterarie sulla luna divinizzata non per compilare un repertorio esaustivo, ma per mettere a fuoco lo scarto che interessa il corpus di ILA. Nei testi greci la luna è una dea: figlia di Iperione, sorella del Sole, amante di Endimione, evocata dalle streghe tessale. Sulla pietra dell\'Anatolia il dio lunare è un maschio, Μήν, senza genealogia, senza mito, definito da epiclesi toponimiche e da un lessico di potere e di espiazione. Le due immagini non si sovrappongono quasi mai — e proprio per questo vanno lette insieme.',
    'I passi sono ordinati per nuclei tematici, non cronologicamente: interessa il modo in cui ciascun testo costruisce la divinità lunare, non la sequenza delle attestazioni. All\'interno di ogni nucleo l\'ordine è invece cronologico.',
  ],

  nuclei: [
    {
      id: 'n1-genealogia',
      titolo: 'I. Genealogia e statuto divino',
      cappello: 'Nella tradizione greca la luna è anzitutto un nome dentro una parentela. Esiodo la colloca in una triade luminosa; l\'innodia le riconosce un culto e una discendenza. È un modo di definire la divinità per posizione — e sarà esattamente ciò che manca al Μήν anatolico delle iscrizioni.',
      testimonia: ['T1', 'T2', 'T3', 'T4'],
    },
    {
      id: 'n2-nomi',
      titolo: 'II. I nomi della luna: σελήνη, μήνη, luna',
      cappello: 'Il nucleo propriamente lessicale, quello su cui il dialogo con LARES è più stretto. Greci e Latini hanno riflettuto a lungo sul nome dell\'astro, e la loro etimologia — anche quando è falsa — dice che cosa credevano che la luna fosse: luce, oppure misura.',
      testimonia: ['T5', 'T6', 'T7', 'T8', 'T9'],
    },
    {
      id: 'n3-epifania',
      titolo: 'III. Epifania, attributi, veicolo',
      cappello: 'Come appare la dea quando appare. Corona d\'oro, corna taurine, cavalli o cavallo: sono gli stessi elementi che l\'iconografia del corpus dispone attorno al Μήν anatolico — con una differenza di genere che i testi non nascondono.',
      testimonia: ['T10', 'T11'],
    },
    {
      id: 'n4-tempo',
      titolo: 'IV. La luna e il tempo festivo',
      cappello: 'La luna non illumina soltanto: scandisce. Il mese greco è lunare, e con il mese lo è il calendario delle feste. Chi sbaglia il computo non sbaglia un\'operazione astronomica: manca un appuntamento con gli dèi.',
      testimonia: ['T12'],
    },
    {
      id: 'n5-culto',
      titolo: 'V. Culto, sacrificio, alterità',
      cappello: 'Quando la letteratura greca parla di sacrifici alla luna, quasi sempre li attribuisce ad altri: ai barbari, agli stranieri, ai riti in cui si scambiano le vesti. È il nucleo in cui il tema dell\'acculturazione religiosa — il cuore del progetto LARES — affiora esplicitamente.',
      testimonia: ['T13', 'T14'],
    },
    {
      id: 'n6-magia',
      titolo: 'VI. Potenza magica e incantesimo',
      cappello: 'La luna che si «tira giù» dal cielo è un topos letterario prima che una pratica documentata. Ma è anche il contesto in cui la dea viene invocata direttamente, in seconda persona, con una formula: la cosa più vicina a una preghiera che la letteratura greca le rivolga.',
      testimonia: ['T15', 'T16'],
    },
    {
      id: 'n7-maschile',
      titolo: 'VII. Il maschile della luna: Μήν e Lunus',
      cappello: 'Il nucleo che tiene insieme questa sezione e il catalogo epigrafico. Poche righe, in tre autori, sono tutto ciò che la letteratura antica dice esplicitamente del dio lunare maschile — quello di cui il corpus di ILA raccoglie centinaia di monumenti.',
      testimonia: ['T17', 'T18', 'T19'],
    },
  ],

  testimonia: [
    // ── I. Genealogia ────────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-01',
      sigla: 'T1',
      autore: 'Esiodo',
      autoreAbbr: 'Hes.',
      opera: 'Teogonia',
      operaAbbr: 'Th.',
      locus: '371–374',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'fine VIII – inizio VII sec. a.C.',
      datazioneSort: -700,
      genere: 'epica',
      testo:
        'Θεία δ᾽ Ἠέλιόν τε μέγαν λαμπράν τε Σελήνην\n' +
        'Ἠῶ θ᾽, ἣ πάντεσσιν ἐπιχθονίοισι φαείνει\n' +
        'ἀθανάτοις τε θεοῖσι, τοὶ οὐρανὸν εὐρὺν ἔχουσι,\n' +
        'γείναθ᾽ ὑποδμηθεῖσ᾽ Ὑπερίονος ἐν φιλότητι.',
      traduzione:
        'E Tia generò il grande Sole e la splendente Selene\n' +
        'e l\'Aurora, che risplende per tutti i mortali\n' +
        'e per gli dèi immortali che possiedono il vasto cielo,\n' +
        'dopo essersi congiunta in amore con Iperione.',
      edizione: 'ed. M. L. West, Oxford 1966',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['genealogia', 'menzione-diretta'],
      lares: [
        { campo: 'rappresentazione', ambito: 'credenza' },
        { campo: 'comunicazione', ambito: 'significato' },
      ],
      commento:
        'Il luogo fondativo della luna greca: Selene è definita per parentela — figlia di Iperione e Tia, sorella di Helios e di Eos — e per una sola qualità, λαμπρά, «splendente». Non c\'è funzione, non c\'è potere, non c\'è culto: c\'è una posizione dentro un sistema. Vale la pena registrare ciò che qui manca e che tornerà a mancare per tutta la tradizione: nessuna epiclesi, nessun luogo. Il Μήν delle iscrizioni funziona all\'inverso — non ha padre né madre, ma ha sempre un aggettivo di luogo (Ἀξιοττηνός, Τιάμου, Ἀσκαηνός) che lo àncora a un territorio. La divinità lunare greca è genealogica, quella anatolica è topografica.',
      termini: [
        { forma: 'Σελήνην', lemma: 'σελήνη', nota: 'accusativo; la forma ionico-attica standard' },
        { forma: 'λαμπράν', lemma: 'λαμπρός', nota: 'unico attributo della dea nel passo' },
      ],
      divinita: ['Selene', 'Helios', 'Eos'],
      personaggi: ['Iperione', 'Tia'],
      corpus: [{ label: 'Epiclesi toponimiche nel corpus', q: 'Ἀξιοττηνῷ' }],
      links: [{ label: 'Perseus / Scaife', url: 'https://scaife.perseus.org/reader/urn:cts:greekLit:tlg0020.tlg001.perseus-grc2/' }],
      bibliografia: ['M. L. West, Hesiod. Theogony, Oxford 1966, ad loc.'],
    },
    {
      id: 'ILA-LIT-selene-02',
      sigla: 'T2',
      autore: 'Apollodoro',
      autoreAbbr: 'Apollod.',
      opera: 'Biblioteca',
      operaAbbr: 'Bibl.',
      locus: '1.2.2',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'I–II sec. d.C.',
      datazioneSort: 100,
      genere: 'mitografia',
      testo: 'Ὑπερίονος δὲ καὶ Θείας Ἠὼς Ἥλιος Σελήνη.',
      traduzione: 'Da Iperione e Tia: Aurora, Sole, Luna.',
      edizione: 'ed. R. Wagner, Leipzig 1894',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['genealogia'],
      lares: [{ campo: 'comunicazione', ambito: 'significato' }],
      commento:
        'La stessa genealogia di Esiodo ridotta a voce di elenco, otto secoli dopo. Serve qui come misura della stabilità del dato: la posizione di Selene nel sistema divino greco non si muove, e non si arricchisce. Nessun manuale mitografico antico registra per la luna un mito proprio paragonabile a quelli di Apollo o di Artemide — la scarsità mitica della luna greca è un fatto strutturale, non un accidente della trasmissione.',
      termini: [{ forma: 'Σελήνη', lemma: 'σελήνη' }],
      divinita: ['Selene', 'Helios', 'Eos'],
      personaggi: ['Iperione', 'Tia'],
    },
    {
      id: 'ILA-LIT-selene-03',
      sigla: 'T3',
      autore: 'Inni omerici',
      autoreAbbr: 'Hymn. Hom.',
      opera: 'A Selene (XXXII)',
      operaAbbr: '32',
      locus: '1–9',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'VI–IV sec. a.C. (datazione discussa)',
      datazioneSort: -450,
      genere: 'inno',
      testo:
        'Μήνην ἀείδειν τανυσίπτερον ἔσπετε Μοῦσαι,\n' +
        'ἡδυεπεῖς κοῦραι Κρονίδεω Διός, ἴστορες ᾠδῆς·\n' +
        'ἧς ἄπο αἴγλη γαῖαν ἑλίσσεται οὐρανόδεικτος\n' +
        'κρατὸς ἀπ᾽ ἀθανάτοιο, πολὺς δ᾽ ὑπὸ κόσμος ὄρωρεν\n' +
        'αἴγλης λαμπούσης· στίλβει δέ τ᾽ ἀλάμπετος ἀὴρ\n' +
        'χρυσέου ἀπὸ στεφάνου, ἀκτῖνες δ᾽ ἐνδιάονται,\n' +
        'εὖτ᾽ ἂν ἀπ᾽ Ὠκεανοῖο λοεσσαμένη χρόα καλόν,\n' +
        'εἵματα ἑσσαμένη τηλαυγέα δῖα Σελήνη,\n' +
        'ζευξαμένη πώλους ἐριαύχενας αἰγλήεντας…',
      traduzione:
        'Cantate, Muse, Mene dalle lunghe ali,\n' +
        'figlie dalla dolce voce di Zeus Cronide, esperte del canto:\n' +
        'da lei un bagliore visibile dal cielo si volge sulla terra,\n' +
        'dal suo capo immortale, e sotto quel bagliore che risplende\n' +
        'si leva un grande ornamento del mondo; brilla l\'aria prima buia\n' +
        'per via della corona d\'oro, e i raggi vi indugiano,\n' +
        'quando, lavato nell\'Oceano il bel corpo,\n' +
        'indossate le vesti che splendono di lontano, la divina Selene\n' +
        'aggioga i puledri dal collo robusto e lucenti…',
      edizione: 'ed. T. W. Allen – W. R. Halliday – E. E. Sikes, Oxford 1936²',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['invocazione', 'descrizione-iconografica', 'epiclesi'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'comunicazione', ambito: 'segno' },
        { campo: 'rappresentazione', ambito: 'credenza' },
      ],
      commento:
        'Il passo più importante della voce, e per una ragione che si legge nella prima parola. L\'inno si intitola Εἰς Σελήνην, ma non comincia con Σελήνη: comincia con Μήνην. Nel giro di nove versi il poeta usa entrambi i nomi come perfetti equivalenti — Μήνη al v. 1, Σελήνη al v. 8 — dimostrando che per il greco arcaico e classico il nome «lunare» e il nome «mensile» della dea sono intercambiabili. Il femminile Μήνη è esattamente la controparte del maschile Μήν che il corpus di ILA documenta a centinaia in Anatolia: la stessa radice, lo stesso significato, il genere opposto. Nessun testo greco spiega perché in Grecia la radice dia una dea e in Lidia e Frigia un dio. Il resto del passo fissa l\'inventario iconografico canonico: bagliore che emana dal capo, corona d\'oro (χρύσεος στέφανος), bagno oceanico, vesti splendenti, carro a puledri. Di questo inventario l\'iconografia del Μήν anatolico conserva l\'attributo capitale — la falce dietro le spalle — e sostituisce il carro con il cavallo.',
      termini: [
        { forma: 'Μήνην', lemma: 'μήνη', nota: 'nome «mensile» della dea; femminile di μήν' },
        { forma: 'Σελήνη', lemma: 'σελήνη', nota: 'nel medesimo passo, come sinonimo' },
        { forma: 'στεφάνου', lemma: 'στέφανος', nota: 'la corona d\'oro, attributo canonico' },
        { forma: 'αἴγλη', lemma: 'αἴγλη', nota: 'il bagliore come sostanza propria della dea' },
      ],
      divinita: ['Selene', 'Mene', 'Zeus'],
      luoghi: ['Oceano'],
      corpus: [
        { label: 'Il teonimo Μήν nel corpus', q: 'Μηνὶ' },
        { label: 'Schede con falce lunare', q: 'crescent' },
      ],
      links: [{ label: 'Perseus / Scaife', url: 'https://scaife.perseus.org/reader/urn:cts:greekLit:tlg0013.tlg032.perseus-grc2/' }],
    },
    {
      id: 'ILA-LIT-selene-04',
      sigla: 'T4',
      autore: 'Inni omerici',
      autoreAbbr: 'Hymn. Hom.',
      opera: 'A Selene (XXXII)',
      operaAbbr: '32',
      locus: '15–18',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'VI–IV sec. a.C.',
      datazioneSort: -450,
      genere: 'inno',
      testo:
        'ἥ ῥά οἱ ἐν μεγάροισι Πανδείην τέκε κούρην,\n' +
        'ἐκπρεπὲς εἶδος ἔχουσαν ἐν ἀθανάτοισι θεοῖσι.\n' +
        'χαῖρε ἄνασσα θεὰ λευκώλενε δῖα Σελήνη,\n' +
        'πρόφρον ἐϋπλόκαμος…',
      traduzione:
        'Ella nella dimora di lui generò la figlia Pandia,\n' +
        'che ha aspetto insigne fra gli dèi immortali.\n' +
        'Salve, sovrana, dea dalle bianche braccia, divina Selene,\n' +
        'benevola, dalle belle trecce…',
      edizione: 'ed. T. W. Allen – W. R. Halliday – E. E. Sikes, Oxford 1936²',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['genealogia', 'invocazione', 'aition'],
      lares: [
        { campo: 'rappresentazione', ambito: 'credenza' },
        { campo: 'comunicazione', ambito: 'parola' },
      ],
      commento:
        'La chiusa dell\'inno fa di Selene madre: dall\'unione con Zeus nasce Pandia, il cui nome è quasi certamente un\'astrazione dal nome di una festa ateniese, i Pandia. È l\'unico caso in cui la letteratura greca àncora la dea lunare a un culto civico preciso, e lo fa per via etimologica, generando un personaggio da un nome di festa. Il meccanismo — dal rito al mito, non viceversa — è quello che interessa a un lessico dell\'acculturazione religiosa. La formula finale χαῖρε ἄνασσα è la chiusa innodica standard: unica traccia di lingua cultuale rivolta alla dea in tutto il corpus omerico.',
      termini: [
        { forma: 'Πανδείην', lemma: 'Πανδία', nota: 'figlia-eponimo della festa ateniese dei Πάνδια' },
        { forma: 'χαῖρε ἄνασσα', lemma: 'χαῖρε', nota: 'formula di congedo innodico' },
        { forma: 'λευκώλενε', lemma: 'λευκώλενος', nota: 'epiteto epico condiviso con Era' },
      ],
      divinita: ['Selene', 'Zeus', 'Pandia'],
      luoghi: ['Atene'],
    },

    // ── II. I nomi ───────────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-05',
      sigla: 'T5',
      autore: 'Saffo',
      autoreAbbr: 'Sapph.',
      opera: 'Frammenti',
      operaAbbr: 'fr.',
      locus: '34 Voigt',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'fine VII – inizio VI sec. a.C.',
      datazioneSort: -600,
      genere: 'lirica',
      testo:
        'ἄστερες μὲν ἀμφὶ κάλαν σελάνναν\n' +
        'ἂψ ἀπυκρύπτοισι φάεννον εἶδος,\n' +
        'ὄπποτα πλήθοισα μάλιστα λάμπηι\n' +
        'γᾶν […]',
      traduzione:
        'Gli astri intorno alla bella luna\n' +
        'nascondono di nuovo il volto splendente,\n' +
        'ogni volta che, colma, essa più risplende\n' +
        'sulla terra […]',
      edizione: 'ed. E.-M. Voigt, Amsterdam 1971',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['menzione-diretta'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'rappresentazione', ambito: 'finzione' },
      ],
      commento:
        'Vale per la forma, non per il contenuto: σελάννα è l\'esito eolico, con geminata, di *σελασνᾱ. Accanto alla dorica σελάνα (Pindaro, Teocrito) e alla ionico-attica σελήνη, mostra che il nome «luminoso» della luna è panellenico e antico. Il nome «mensile» Μήνη, invece, resta minoritario in poesia e diventa dominante — al maschile — solo in Anatolia. La distribuzione dialettale è quindi un argomento a favore dell\'ipotesi che Μήν anatolico non sia un prestito dal greco poetico ma il punto d\'incontro fra una radice indoeuropea del mese e un culto lunare locale.',
      termini: [
        { forma: 'σελάνναν', lemma: 'σελήνη', nota: 'forma eolica con geminata, da *σελασνᾱ' },
        { forma: 'πλήθοισα', lemma: 'πλήθω', nota: 'della luna piena; cfr. διχόμηνις' },
      ],
      divinita: ['Selene'],
    },
    {
      id: 'ILA-LIT-selene-06',
      sigla: 'T6',
      autore: 'Pindaro',
      autoreAbbr: 'Pind.',
      opera: 'Olimpiche',
      operaAbbr: 'Ol.',
      locus: '3.19–20',
      lingua: 'grc',
      refType: 'lit',
      datazione: '476 a.C. ca.',
      datazioneSort: -476,
      genere: 'lirica',
      testo:
        '…διχόμηνις ὅλον χρυσάρματος\n' +
        'ἑσπέρας ὀφθαλμὸν ἀντέφλεξε Μήνα.',
      traduzione:
        '…e a mezzo del mese, dal carro d\'oro, Mena\n' +
        'accese di contro l\'intero occhio della sera.',
      edizione: 'ed. B. Snell – H. Maehler, Leipzig 1987⁸',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['menzione-diretta', 'descrizione-iconografica', 'computo-del-tempo'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'fruizione', ambito: 'sistemi' },
      ],
      commento:
        'Tre elementi in due versi. Il nome è Μήνα, dorico per Μήνη: il nome «mensile» della dea, ancora una volta usato in poesia alta senza alcuna differenza di valore rispetto a Σελήνη. L\'attributo è χρυσάρματος, «dal carro d\'oro», che conferma il veicolo dell\'inno omerico. E la determinazione temporale è διχόμηνις, «a metà mese»: il plenilunio è definito non astronomicamente ma per posizione nel mese, cioè attraverso l\'unità di misura che la luna stessa istituisce. La luna greca è già, sul piano lessicale, un fatto di calendario — che è il ponte verso il nucleo IV.',
      termini: [
        { forma: 'Μήνα', lemma: 'μήνη', nota: 'forma dorica; cfr. Μήνην in Hymn. Hom. 32.1' },
        { forma: 'διχόμηνις', lemma: 'διχόμηνις', nota: '«a mezzo mese», il plenilunio definito per calendario' },
        { forma: 'χρυσάρματος', lemma: 'χρυσάρματος', nota: 'attributo del carro; cfr. Hymn. Hom. 32.9' },
      ],
      divinita: ['Mene', 'Selene'],
    },
    {
      id: 'ILA-LIT-selene-07',
      sigla: 'T7',
      autore: 'Platone',
      autoreAbbr: 'Pl.',
      opera: 'Cratilo',
      operaAbbr: 'Cra.',
      locus: '409a–c',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'primo quarto del IV sec. a.C.',
      datazioneSort: -385,
      genere: 'filosofia',
      testo:
        'σέλας δὲ καὶ φῶς ταὐτόν. νέον δέ που καὶ ἕνον ἀεί ἐστι\n' +
        'περὶ τὴν σελήνην τοῦτο τὸ φῶς […]',
      traduzione:
        'E σέλας e φῶς sono la stessa cosa. Ora, questa luce intorno alla luna\n' +
        'è sempre insieme nuova e vecchia […]',
      edizione: 'ed. J. Burnet, Oxford 1900–1907',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['etimologia'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'comunicazione', ambito: 'significato' },
      ],
      commento:
        'Il passo etimologico centrale della tradizione greca sul nome della luna, e il più interessante per un lessico come LARES. Socrate scompone σελήνη in σέλας («bagliore») più il tratto per cui la sua luce è sempre insieme «nuova» (νέον) e «vecchia» (ἕνον) — dove ἕνη è propriamente il termine del calendario per l\'ultimo giorno del mese. Dalla combinazione dei quattro elementi Socrate ricava un composto mostruoso che, «compresso», darebbe la forma dorica σελαναία. L\'etimologia è falsa in linguistica storica ma esatta come documento culturale: dice che per un greco del IV secolo il nome della luna contiene già, insieme, la luce e il mese. È lo stesso doppio contenuto che il greco distribuisce fra σελήνη e μήνη, e che l\'anatolico condensa in un solo teonimo maschile, Μήν.',
      termini: [
        { forma: 'σέλας', lemma: 'σέλας', nota: 'base etimologica proposta per σελήνη' },
        { forma: 'ἕνον', lemma: 'ἕνος', nota: 'termine di calendario: l\'ultimo giorno del mese' },
        { forma: 'σελήνην', lemma: 'σελήνη' },
      ],
      divinita: ['Selene'],
      figure: ['Anassagora', 'Socrate'],
    },
    {
      id: 'ILA-LIT-selene-08',
      sigla: 'T8',
      autore: 'Varrone',
      autoreAbbr: 'Varro',
      opera: 'De lingua Latina',
      operaAbbr: 'Ling.',
      locus: '5.68',
      lingua: 'lat',
      refType: 'lit',
      datazione: '45–43 a.C. ca.',
      datazioneSort: -44,
      genere: 'antiquaria',
      testo: 'Luna, quod sola lucet noctu. Itaque ea dicta Noctiluca in Palatio.',
      traduzione: 'Luna, perché sola risplende di notte. Perciò sul Palatino fu chiamata Noctiluca.',
      edizione: 'ed. G. Goetz – F. Schoell, Leipzig 1910',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['etimologia', 'notizia-cultuale', 'epiclesi'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'fruizione', ambito: 'strutture' },
      ],
      commento:
        'La stessa operazione di Platone, in latino e con un supplemento: Varrone non si ferma all\'etimologia (luna da lucere, con l\'aggiunta paretimologica di sola) ma la fa atterrare su un culto — la Noctiluca del Palatino. È un procedimento che la voce registra volentieri: l\'epiclesi latina nasce qui dichiaratamente dalla stessa radice del nome, esattamente come le epiclesi anatoliche del Μήν nascono dal nome del luogo. Due modi opposti di qualificare la divinità lunare: per proprietà luminosa a Roma, per appartenenza territoriale in Lidia.',
      termini: [
        { forma: 'Luna', lemma: 'luna' },
        { forma: 'Noctiluca', lemma: 'Noctiluca', nota: 'epiclesi cultuale romana, «che luce di notte»' },
      ],
      divinita: ['Luna', 'Noctiluca'],
      luoghi: ['Roma', 'Palatino'],
    },
    {
      id: 'ILA-LIT-selene-09',
      sigla: 'T9',
      autore: 'Cicerone',
      autoreAbbr: 'Cic.',
      opera: 'De natura deorum',
      operaAbbr: 'Nat. D.',
      locus: '2.68',
      lingua: 'lat',
      refType: 'lit',
      datazione: '45 a.C.',
      datazioneSort: -45,
      genere: 'filosofia',
      testo: 'Luna a lucendo nominata sit; eadem est enim Lucina.',
      traduzione: 'Luna prende nome dal risplendere; ed è la stessa che Lucina.',
      edizione: 'ed. A. S. Pease, Cambridge (Mass.) 1955–1958',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['etimologia', 'assimilazione'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'rappresentazione', ambito: 'credenza' },
      ],
      commento:
        'Cicerone porta l\'etimologia un passo oltre Varrone: dalla radice della luce ricava un\'identificazione cultuale, Luna = Lucina, la dea del parto. È il meccanismo dell\'assimilazione teologica per via lessicale — si identificano due divinità perché i loro nomi condividono una radice — che nella cultura greco-romana produce sistematicamente sincretismi. Rilevante per il corpus: le assimilazioni del Μήν anatolico (con Attis, con Sabazio, con Mithra nelle iscrizioni tardo-romane) seguono percorsi diversi, cultuali e non etimologici. La letteratura sincretizza per nomi, l\'epigrafia per pratiche.',
      termini: [
        { forma: 'Luna', lemma: 'luna' },
        { forma: 'Lucina', lemma: 'Lucina', nota: 'dea del parto, qui identificata con la Luna' },
      ],
      divinita: ['Luna', 'Lucina'],
      corpus: [{ label: 'Men e Attis nelle iscrizioni di Roma', q: 'Menotyranno' }],
    },

    // ── III. Epifania ────────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-10',
      sigla: 'T10',
      autore: 'Inni orfici',
      autoreAbbr: 'Orph.',
      opera: 'Inno a Selene (IX)',
      operaAbbr: 'H.',
      locus: '9.1–4',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'II–III sec. d.C. (raccolta microasiatica)',
      datazioneSort: 200,
      genere: 'inno',
      testo:
        'Κλῦθι, θεὰ βασίλεια, φαεσφόρε, δῖα Σελήνη,\n' +
        'ταυρόκερως Μήνη, νυκτιδρόμε, ἠεροφοῖτι,\n' +
        'ἐννυχία, δᾳδοῦχε, κόρη, εὐάστερε Μήνη,\n' +
        'αὐξομένη καὶ λειπομένη, θῆλύς τε καὶ ἄρσην…',
      traduzione:
        'Ascolta, dea regina, portatrice di luce, divina Selene,\n' +
        'Mene dalle corna di toro, che corri nella notte, che vaghi nell\'aria,\n' +
        'notturna, portatrice di fiaccola, fanciulla, Mene dalle belle stelle,\n' +
        'crescente e calante, femmina insieme e maschio…',
      edizione: 'ed. G. Quandt, Berlin 1955²',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['invocazione', 'descrizione-iconografica', 'epiclesi'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'comunicazione', ambito: 'segno' },
        { campo: 'rappresentazione', ambito: 'credenza' },
      ],
      commento:
        'Il testo letterario più vicino al mondo del corpus, e non per caso: la raccolta orfica si forma nell\'Asia Minore imperiale, la stessa area e la stessa epoca delle stele di Men. Tre elementi vanno segnalati. Primo: ταυρόκερως Μήνη — la dea è «dalle corna di toro», cioè la falce è letta come corno bovino, esattamente la chiave iconografica con cui vanno lette le lunette dietro le spalle del Μήν anatolico e la sua associazione col toro. Secondo: il nome Μήνη ricorre due volte in quattro versi, con una frequenza che nessun testo greco anteriore mostra: nell\'Anatolia imperiale il nome «mensile» ha vinto sul nome «luminoso». Terzo, e decisivo: θῆλύς τε καὶ ἄρσην, «femmina e maschio insieme». È l\'unica affermazione esplicita, in un testo cultuale greco, che la divinità lunare non ha un genere fisso. Detto in Asia Minore nel II–III secolo, mentre a poche decine di chilometri si dedicano stele a un Μήν maschile, non è una speculazione teologica astratta: è la registrazione innodica di una situazione religiosa reale.',
      termini: [
        { forma: 'ταυρόκερως', lemma: 'ταυρόκερως', nota: 'la falce lunare letta come corno di toro' },
        { forma: 'Μήνη', lemma: 'μήνη', nota: 'due occorrenze in quattro versi' },
        { forma: 'θῆλύς τε καὶ ἄρσην', lemma: 'θῆλυς', nota: 'androginia esplicita della divinità lunare' },
        { forma: 'δᾳδοῦχε', lemma: 'δᾳδοῦχος', nota: 'titolo cultuale eleusino applicato alla dea' },
      ],
      divinita: ['Selene', 'Mene'],
      luoghi: ['Asia Minore'],
      corpus: [
        { label: 'Men e il toro nelle iscrizioni', q: 'toro' },
        { label: 'Il teonimo al genitivo (Μηνός)', q: 'Μηνὸς' },
      ],
    },
    {
      id: 'ILA-LIT-selene-11',
      sigla: 'T11',
      autore: 'Pausania',
      autoreAbbr: 'Paus.',
      opera: 'Periegesi della Grecia',
      operaAbbr: '',
      locus: '5.11.8',
      lingua: 'grc',
      refType: 'lit',
      datazione: '170–180 d.C. ca.',
      datazioneSort: 175,
      genere: 'periegesi',
      testo: '…πεποίηται δὲ καὶ Ἥλιος ἐπὶ ἅρματος, Σελήνη δὲ ἵππον ἐμοὶ δοκεῖν ἐλαύνουσα.',
      traduzione: '…vi è raffigurato anche Helios su un carro, e Selene che cavalca — mi pare — un cavallo.',
      edizione: 'ed. F. Spiro, Leipzig 1903',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['descrizione-iconografica', 'notizia-cultuale'],
      lares: [
        { campo: 'comunicazione', ambito: 'segno' },
        { campo: 'fruizione', ambito: 'strumenti' },
      ],
      commento:
        'Sul trono dello Zeus di Fidia a Olimpia, Helios ha il carro e Selene il cavallo. La distinzione non è decorativa: separa il sole, che percorre una traiettoria diurna regolare da cocchiere, dalla luna, il cui moto irregolare si presta alla figura del cavaliere. Il dettaglio interessa direttamente il corpus, dove il Μήν anatolico compare ripetutamente a cavallo — un\'iconografia che si è spesso spiegata solo con i modelli dei «cavalieri» traci e microasiatici, e che invece ha anche questo antecedente greco, applicato proprio alla divinità lunare. Da notare l\'ἐμοὶ δοκεῖν: Pausania stesso non è certo di ciò che vede, e la cautela di un testimone oculare vale più di un\'asserzione.',
      termini: [
        { forma: 'ἵππον … ἐλαύνουσα', lemma: 'ἐλαύνω', nota: 'la dea a cavallo, non sul carro' },
        { forma: 'ἅρματος', lemma: 'ἅρμα', nota: 'il carro, riservato a Helios' },
      ],
      divinita: ['Selene', 'Helios', 'Zeus'],
      luoghi: ['Olimpia'],
      figure: ['Fidia'],
      corpus: [{ label: 'Men a cavallo nel corpus', q: 'cavallo' }],
    },

    // ── IV. Il tempo ─────────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-12',
      sigla: 'T12',
      autore: 'Aristofane',
      autoreAbbr: 'Ar.',
      opera: 'Nuvole',
      operaAbbr: 'Nub.',
      locus: '615–619',
      lingua: 'grc',
      refType: 'lit',
      datazione: '423 a.C. (rappresentazione); revisione 419–416',
      datazioneSort: -423,
      genere: 'commedia',
      testo:
        '…οὐκ ἄγειν τὰς ἡμέρας\n' +
        'οὐδὲν ὀρθῶς, ἀλλ᾽ ἄνω τε καὶ κάτω κυδοιδοπᾶν·\n' +
        'ὥστ᾽ ἀπειλεῖν φησιν αὐτῇ τοὺς θεοὺς ἑκάστοτε,\n' +
        'ἡνίκ᾽ ἂν ψευσθῶσι δείπνου κἀπίωσιν οἴκαδε\n' +
        'τῆς ἑορτῆς μὴ τυχόντες κατὰ λόγον τῶν ἡμερῶν.',
      traduzione:
        '…che non tenete affatto i giorni\n' +
        'come si deve, ma li rimescolate sottosopra;\n' +
        'sicché — dice — gli dèi ogni volta la minacciano,\n' +
        'quando restano delusi del pranzo e se ne tornano a casa\n' +
        'non avendo avuto la festa secondo il conto dei giorni.',
      edizione: 'ed. K. J. Dover, Oxford 1968',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['computo-del-tempo', 'notizia-cultuale'],
      lares: [
        { campo: 'fruizione', ambito: 'sistemi' },
        { campo: 'rappresentazione', ambito: 'pratica' },
      ],
      commento:
        'Il Coro riferisce le lagnanze della Luna contro gli Ateniesi, che sfasano il calendario civile rispetto al mese lunare: il risultato è che le feste cadono nel giorno sbagliato e gli dèi restano a digiuno. Il passo è comico ma il presupposto è serio, ed è quello che rende la divinità lunare strutturalmente diversa da ogni altra: la luna non riceve semplicemente un culto, essa fonda l\'unità di misura entro cui ogni culto è possibile. Sbagliare la luna significa sbagliare tutti gli altri dèi. Questo spiega perché nelle iscrizioni del corpus la formula di datazione — ἔτους …, μηνὸς … — non sia un dato archivistico accessorio ma l\'inserimento dell\'atto votivo dentro il tempo che il dio stesso governa. Il μήν della datazione e il Μήν del teonimo sono la stessa parola.',
      termini: [
        { forma: 'τὰς ἡμέρας … ἄγειν', lemma: 'ἄγω', nota: 'tecnicismo: «tenere il calendario»' },
        { forma: 'κατὰ λόγον τῶν ἡμερῶν', lemma: 'λόγος', nota: '«secondo il conto dei giorni»' },
        { forma: 'ἑορτῆς', lemma: 'ἑορτή', nota: 'la festa come appuntamento calendariale' },
      ],
      divinita: ['Selene'],
      luoghi: ['Atene'],
      corpus: [{ label: 'Formule di datazione per mese', q: 'μηνὸς' }],
    },

    // ── V. Culto e alterità ──────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-13',
      sigla: 'T13',
      autore: 'Aristofane',
      autoreAbbr: 'Ar.',
      opera: 'Pace',
      operaAbbr: 'Pax',
      locus: '406–411',
      lingua: 'grc',
      refType: 'lit',
      datazione: '421 a.C.',
      datazioneSort: -421,
      genere: 'commedia',
      testo: '…ὁτιὴ θύομεν ἡμεῖς ἐκείνοις, τοῖσι δ᾽ οἱ βάρβαροι θύουσι.',
      traduzione: '…perché noi sacrifichiamo a quelli, mentre a loro due sacrificano i barbari.',
      edizione: 'ed. N. G. Wilson, Oxford 2007',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['notizia-cultuale', 'descrizione-rituale'],
      lares: [
        { campo: 'rappresentazione', ambito: 'pratica' },
        { campo: 'fruizione', ambito: 'sistemi' },
      ],
      commento:
        'Ermes spiega perché Sole e Luna tramano di consegnare la Grecia ai barbari: perché i Greci sacrificano agli dèi olimpici, mentre a Helios e Selene sacrificano i non greci. In cinque parole Aristofane consegna la mappa cultuale che interessa a questa sezione: il culto astrale è percepito, ad Atene nel V secolo, come costitutivamente straniero. È lo stesso confine che il corpus di ILA documenta dall\'altra parte — in Lidia, Frigia, Pisidia, dove il dio lunare non è un culto esotico ma il culto locale per eccellenza, e dove sono semmai gli dèi olimpici a doversi accreditare. La commedia attica e le stele anatoliche descrivono la stessa frontiera religiosa vista dai due lati opposti.',
      termini: [
        { forma: 'θύομεν', lemma: 'θύω', nota: 'il verbo del sacrificio, qui in opposizione noi/loro' },
        { forma: 'βάρβαροι', lemma: 'βάρβαρος', nota: 'i destinatari del culto astrale' },
      ],
      divinita: ['Selene', 'Helios'],
      luoghi: ['Atene'],
    },
    {
      id: 'ILA-LIT-selene-14',
      sigla: 'T14',
      autore: 'Macrobio (che cita Filocoro)',
      autoreAbbr: 'Macr.',
      opera: 'Saturnalia',
      operaAbbr: 'Sat.',
      locus: '3.8.2–3',
      lingua: 'lat',
      refType: 'lit',
      datazione: 'inizio V sec. d.C. (Filocoro: III sec. a.C.)',
      datazioneSort: 420,
      genere: 'antiquaria',
      testo:
        'Philochorus quoque in Atthide eandem adfirmat esse Lunam, et ei sacrificium facere\n' +
        'viros cum veste muliebri, mulieres cum virili, quod eadem et mas aestimatur et femina.',
      traduzione:
        'Anche Filocoro, nell\'Atthis, afferma che essa è la stessa cosa che la Luna, e che le sacrificano\n' +
        'gli uomini in veste femminile e le donne in veste maschile, perché la si ritiene insieme maschio e femmina.',
      edizione: 'ed. R. A. Kaster, Oxford 2011',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['descrizione-rituale', 'notizia-cultuale', 'assimilazione'],
      lares: [
        { campo: 'rappresentazione', ambito: 'pratica' },
        { campo: 'fruizione', ambito: 'strumenti' },
        { campo: 'rappresentazione', ambito: 'credenza' },
      ],
      commento:
        'Testimonianza capitale, e la sola che documenti un rito. Macrobio, discutendo della Venere barbuta di Cipro, cita l\'atidografo Filocoro: quella divinità è la Luna, e nel suo culto uomini e donne si scambiano le vesti, «perché la si ritiene insieme maschio e femmina». Qui l\'androginia lunare non è una formula innodica (come in T10) ma la ragione dichiarata di una prassi rituale, con inversione dei segni di genere. Per il corpus di ILA questo passo è il migliore antecedente concettuale del Μήν maschile: dimostra che l\'ambiguità di genere della divinità lunare era un dato riconosciuto dagli eruditi greci già nel III secolo a.C., prima e indipendentemente dall\'evidenza epigrafica anatolica, e che poteva tradursi in comportamento cultuale. La catena di trasmissione — un autore latino tardoantico che cita un greco ellenistico su un culto cipriota — è però lunga: il valore della notizia va pesato come tale.',
      termini: [
        { forma: 'et mas … et femina', lemma: 'mas', nota: 'androginia come motivazione esplicita del rito' },
        { forma: 'veste muliebri / virili', lemma: 'vestis', nota: 'inversione rituale dei segni di genere' },
      ],
      divinita: ['Luna', 'Venere', 'Afrodito'],
      figure: ['Filocoro'],
      luoghi: ['Cipro', 'Amatunte'],
      corpus: [{ label: 'Culti a genere ambiguo: Attis e Men', q: 'Attis' }],
    },

    // ── VI. Magia ────────────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-15',
      sigla: 'T15',
      autore: 'Teocrito',
      autoreAbbr: 'Theoc.',
      opera: 'Idilli (Le incantatrici)',
      operaAbbr: 'Id.',
      locus: '2.10–12, 69',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'primo quarto del III sec. a.C.',
      datazioneSort: -275,
      genere: 'poesia-ellenistica',
      testo:
        'χαῖρε, Σελάνα\n' +
        'φαεννά· τὶν γὰρ ποταείσομαι ἅσυχα, δαῖμον,\n' +
        'καὶ τᾷ χθονίᾳ Ἑκάτᾳ…\n' +
        '   ⟨rit.⟩ φράζεό μευ τὸν ἔρωθ᾽ ὅθεν ἵκετο, πότνα Σελάνα.',
      traduzione:
        'Salve, Selena\n' +
        'splendente: a te canterò sommessamente, dèmone,\n' +
        'e a Ecate ctonia…\n' +
        '   ⟨rit.⟩ Considera, veneranda Selena, donde mi sia venuto l\'amore.',
      edizione: 'ed. A. S. F. Gow, Cambridge 1952²',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['invocazione', 'descrizione-rituale', 'assimilazione'],
      lares: [
        { campo: 'comunicazione', ambito: 'parola' },
        { campo: 'rappresentazione', ambito: 'pratica' },
        { campo: 'fruizione', ambito: 'strumenti' },
      ],
      commento:
        'Simeta compie il suo incantesimo d\'amore rivolgendosi alla luna in seconda persona, con un\'apostrofe (χαῖρε, Σελάνα) e un ritornello che scandisce ogni strofa. È il testo greco in cui la dea lunare riceve la formulazione più vicina alla preghiera: appellativo (πότνα), imperativo (φράζεο), esposizione del caso. Notevole anche l\'accostamento immediato a Ecate ctonia — la luna della magia non è mai sola, è sempre nodo di un\'assimilazione. Il confronto con il corpus è istruttivo per contrasto: le stele di Men usano un lessico giuridico e penitenziale (ἐκολάσθη, ἱλασάμενος, εὐχαριστήριον), non incantatorio. La divinità lunare letteraria è oggetto di coercizione magica; quella epigrafica è soggetto di punizione e di perdono.',
      termini: [
        { forma: 'Σελάνα', lemma: 'σελήνη', nota: 'forma dorica' },
        { forma: 'πότνα', lemma: 'πότνια', nota: 'appellativo cultuale femminile' },
        { forma: 'φράζεο', lemma: 'φράζομαι', nota: 'imperativo della formula magica' },
        { forma: 'χθονίᾳ', lemma: 'χθόνιος', nota: 'epiteto di Ecate, assimilata alla luna' },
      ],
      divinita: ['Selene', 'Ecate'],
      personaggi: ['Simeta'],
      corpus: [{ label: 'Stele di confessione nel corpus', q: 'confession' }],
    },
    {
      id: 'ILA-LIT-selene-16',
      sigla: 'T16',
      autore: 'Apollonio Rodio',
      autoreAbbr: 'A.R.',
      opera: 'Argonautiche',
      operaAbbr: '',
      locus: '4.57–61',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'metà del III sec. a.C.',
      datazioneSort: -250,
      genere: 'poesia-ellenistica',
      testo:
        'οὐκ ἄρ᾽ ἐγὼ μούνη μετὰ Λάτμιον ἄντρον ἀλύσκω,\n' +
        'οὐδ᾽ οἴη καλῷ περιδαίομαι Ἐνδυμίωνι·\n' +
        'ἦ θαμὰ δὴ καὶ σεῖο κίον δολίῃσιν ἀοιδαῖς\n' +
        'μνησαμένη φιλότητος, ἵνα σκοτίῃ ἐνὶ νυκτὶ\n' +
        'φαρμάσσῃς εὔκηλος, ἅ τοι φίλα ἔργα τέτυκται.',
      traduzione:
        'Non sono dunque io sola a rifugiarmi nell\'antro di Latmo,\n' +
        'né sola a bruciare d\'amore per il bel Endimione:\n' +
        'ben spesso anch\'io, per i tuoi canti ingannevoli,\n' +
        'mi sono ritirata ripensando all\'amore, perché tu nella notte buia\n' +
        'facessi indisturbata i tuoi sortilegi, che ti sono cari.',
      edizione: 'ed. H. Fränkel, Oxford 1961',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['aition', 'menzione-diretta'],
      lares: [
        { campo: 'rappresentazione', ambito: 'finzione' },
        { campo: 'comunicazione', ambito: 'segno' },
      ],
      commento:
        'La Luna schernisce Medea in fuga: anch\'io ho amato — Endimione nell\'antro di Latmo — e anch\'io ho dovuto ritirarmi dal cielo, costretta dai tuoi incantesimi tessali. Il passo condensa i due soli miti che la Grecia riservi alla luna: l\'amore per Endimione e il «tirare giù la luna» delle maghe. Entrambi hanno la stessa struttura — la dea che viene sottratta al cielo — ed entrambi sono miti di passività. È l\'immagine esattamente opposta a quella che il corpus restituisce: il Μήν anatolico è δεσπότης e τύραννος, giudica, punisce, esige confessioni. Nessuna fonte letteraria greca attribuisce mai alla luna un\'iniziativa punitiva; nessuna stele lidia le attribuisce mai una vicenda amorosa.',
      termini: [
        { forma: 'φαρμάσσῃς', lemma: 'φαρμάσσω', nota: 'praticare sortilegi con φάρμακα' },
        { forma: 'δολίῃσιν ἀοιδαῖς', lemma: 'ἀοιδή', nota: 'i canti magici che trascinano giù la luna' },
      ],
      divinita: ['Selene'],
      personaggi: ['Endimione', 'Medea'],
      luoghi: ['Latmo', 'Tessaglia'],
      corpus: [{ label: 'Men τύραννος nel corpus', q: 'Τυράννῳ' }],
    },

    // ── VII. Il maschile ─────────────────────────────────────────────────
    {
      id: 'ILA-LIT-selene-17',
      sigla: 'T17',
      autore: 'Historia Augusta',
      autoreAbbr: 'HA',
      opera: 'Antoninus Caracallus',
      operaAbbr: 'Carac.',
      locus: '6.6–7.4',
      lingua: 'lat',
      refType: 'lit',
      datazione: 'fine IV sec. d.C.',
      datazioneSort: 395,
      genere: 'biografia',
      testo:
        'Qui autem Lunam feminino nomine ac sexu putaverit nuncupandam,\n' +
        'addictus mulieribus semper serviet; at vero qui marem deum esse crediderit,\n' +
        'is dominabitur uxori neque ullas muliebres insidias timebit.',
      traduzione:
        'Chi poi ritenga che la Luna debba chiamarsi con nome e sesso femminile,\n' +
        'sarà per sempre schiavo delle donne, ad esse asservito; chi invece creda che sia un dio maschio,\n' +
        'dominerà la moglie e non temerà alcuna insidia femminile.',
      edizione: 'ed. E. Hohl, Leipzig 1965²',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['notizia-cultuale', 'epiclesi', 'allegoria'],
      lares: [
        { campo: 'rappresentazione', ambito: 'credenza' },
        { campo: 'comunicazione', ambito: 'significato' },
        { campo: 'fruizione', ambito: 'strutture' },
      ],
      commento:
        'Il passo latino decisivo per l\'intera questione. In margine al viaggio di Caracalla al tempio lunare di Carre, il biografo registra la dottrina locale su un dio-luna maschile — Lunus — e la giustifica con un argomento che non è teologico ma sociale: dal genere che attribuisci alla luna dipende chi comanda in casa. La testimonianza è tarda, aneddotica e appartiene a un\'opera notoriamente inaffidabile: non prova nulla sulla teologia orientale. Prova però qualcosa sul lessico e sulla percezione: nel mondo romano il genere della divinità lunare era un problema riconosciuto, discusso, e associato all\'Oriente. È esattamente lo scarto che il corpus di ILA documenta materialmente. Da leggere insieme a T14 (Filocoro) e T10 (θῆλύς τε καὶ ἄρσην): tre testi lontanissimi per lingua, data e genere convergono sullo stesso punto — la luna non ha un genere stabile — e solo in Anatolia quel punto si risolve stabilmente al maschile.',
      termini: [
        { forma: 'Lunam … marem deum', lemma: 'Lunus', nota: 'il dio-luna maschile' },
        { forma: 'feminino nomine ac sexu', lemma: 'sexus', nota: 'genere grammaticale e genere divino tenuti insieme' },
      ],
      divinita: ['Luna', 'Lunus'],
      figure: ['Caracalla'],
      luoghi: ['Carre'],
      corpus: [{ label: 'Tutte le attestazioni di Men', q: 'Μηνὶ' }],
    },
    {
      id: 'ILA-LIT-selene-18',
      sigla: 'T18',
      autore: 'Strabone',
      autoreAbbr: 'Str.',
      opera: 'Geografia',
      operaAbbr: '',
      locus: '12.3.31',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'inizio I sec. d.C.',
      datazioneSort: 18,
      genere: 'geografia',
      testo:
        '…ἐν ᾗ τὸ τοῦ Μηνὸς Φαρνάκου ἱερόν, […] καὶ ὁ ὅρκος ὁ βασιλικός·\n' +
        '«Τύχην βασιλέως καὶ Μῆνα Φαρνάκου».',
      traduzione:
        '…nella quale si trova il santuario di Men di Farnace, […] e il giuramento regio:\n' +
        '«per la Fortuna del re e per Men di Farnace».',
      edizione: 'ed. S. Radt, Göttingen 2002–2011',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['notizia-cultuale', 'epiclesi', 'menzione-diretta'],
      lares: [
        { campo: 'fruizione', ambito: 'strutture' },
        { campo: 'rappresentazione', ambito: 'pratica' },
        { campo: 'comunicazione', ambito: 'parola' },
      ],
      commento:
        'La prima attestazione letteraria del teonimo maschile Μήν, e già con tutti i tratti che il corpus confermerà. L\'epiclesi non è descrittiva ma possessiva — Μὴν Φαρνάκου, «Men di Farnace», dal nome del sovrano pontico che ne stabilì o ne rifondò il santuario ad Ameria. Il dio è titolare di un ἱερόν con terre e personale, e soprattutto è garante del giuramento regio: una funzione giuridica, non astrale. Fra la Selene dei nuclei I–VI e questo Μήν non c\'è alcuna continuità narrativa: cambia il genere, cambia la formazione dell\'epiclesi, cambia la sfera d\'azione. Il corpus di ILA comincia, cronologicamente e concettualmente, qui.',
      termini: [
        { forma: 'Μηνὸς Φαρνάκου', lemma: 'Μήν', nota: 'epiclesi al genitivo di possesso, tipo anatolico' },
        { forma: 'ὅρκος', lemma: 'ὅρκος', nota: 'il dio come garante del giuramento' },
        { forma: 'ἱερόν', lemma: 'ἱερόν', nota: 'santuario con terre e ἱερόδουλοι' },
      ],
      divinita: ['Men', 'Men Pharnakou', 'Tyche'],
      figure: ['Farnace I'],
      luoghi: ['Ameria', 'Cabira', 'Ponto'],
      corpus: [
        { label: 'Men Pharnakou nel corpus', q: 'Φαρνάκου' },
        { label: 'Epiclesi al genitivo (Τιάμου, …)', q: 'Τιάμου' },
      ],
    },
    {
      id: 'ILA-LIT-selene-19',
      sigla: 'T19',
      autore: 'Strabone',
      autoreAbbr: 'Str.',
      opera: 'Geografia',
      operaAbbr: '',
      locus: '12.8.14',
      lingua: 'grc',
      refType: 'lit',
      datazione: 'inizio I sec. d.C.',
      datazioneSort: 18,
      genere: 'geografia',
      testo: '…τὸ τοῦ Μηνὸς Ἀσκαίου ἱερόν, ἔχον ἱεροδούλων πλῆθος καὶ χωρία ἱερά…',
      traduzione: '…il santuario di Men Askaios, che possiede una moltitudine di ieroduli e terre sacre…',
      edizione: 'ed. S. Radt, Göttingen 2002–2011',
      traduttore: ED,
      collazione: 'da-collazionare',
      tipo: ['notizia-cultuale', 'epiclesi'],
      lares: [
        { campo: 'fruizione', ambito: 'strutture' },
        { campo: 'fruizione', ambito: 'sistemi' },
      ],
      commento:
        'Il santuario di Men presso Antiochia di Pisidia, con ieroduli e proprietà fondiarie: la forma organizzativa del grande tempio anatolico, che Strabone descrive con lo stesso schema usato per Comana e per Zela. L\'epiclesi Ἀσκαίου (nelle iscrizioni Ἀσκαηνός) è toponimica, e con essa entriamo nel meccanismo che governa l\'intero corpus — il dio è identificato dal luogo che presiede. Due sole righe di Strabone bastano quindi a fissare i due tipi di epiclesi che il catalogo epigrafico documenterà a centinaia: il genitivo di possesso (T18) e l\'aggettivo di luogo. Ed è tutto ciò che la letteratura antica dice del culto di Men: due notizie geografiche e un aneddoto biografico (T17).',
      termini: [
        { forma: 'Μηνὸς Ἀσκαίου', lemma: 'Μήν', nota: 'epiclesi toponimica; nelle iscrizioni Ἀσκαηνός' },
        { forma: 'ἱεροδούλων', lemma: 'ἱερόδουλος', nota: 'personale servile del santuario' },
        { forma: 'χωρία ἱερά', lemma: 'χωρίον', nota: 'terre di proprietà templare' },
      ],
      divinita: ['Men', 'Men Askaenos'],
      luoghi: ['Antiochia di Pisidia', 'Pisidia'],
      corpus: [{ label: 'Men Askaenos nel corpus', q: 'Ἀσκαηνῷ' }],
    },
  ],

  sintesi: [
    'Il bilancio è netto e vale più di ogni singolo passo. Diciannove testimonianze distribuite su undici secoli, e di queste solo tre — T17, T18, T19 — riguardano il dio lunare maschile che è l\'oggetto del corpus. Due sono notizie geografiche di Strabone, la terza è un aneddoto in un\'opera notoriamente inaffidabile. La letteratura antica, in altre parole, non ha praticamente nulla da dire sul culto di Men: centinaia di monumenti e meno di venti righe di testo.',
    'Questo silenzio è il dato più importante della voce, e va formulato con precisione: non è un silenzio sulla luna, che i Greci nominano di continuo, ma sul dio lunare anatolico. La divinità lunare della letteratura greca è femminile, genealogica, poco mitica, sostanzialmente passiva — amata da Endimione, tirata giù dalle maghe tessale, incaricata di reggere il calendario. La divinità lunare delle stele di Lidia e Frigia è maschile, senza parentela, titolare di santuari con terre e ieroduli, garante di giuramenti, e soprattutto giudice: punisce, esige la confessione, concede il perdono. Non sono due varianti dello stesso dio: sono due costruzioni religiose che condividono l\'astro e la radice del nome.',
    'La radice, però, è condivisa davvero, e qui i testi dicono più di quanto sembri. L\'inno omerico apre con Μήνην dove il titolo annuncia Σελήνη (T3); Pindaro dice Μήνα (T6); l\'inno orfico, composto proprio in Asia Minore, ripete Μήνη due volte in quattro versi (T10). Il nome «mensile» della luna esiste in greco fin dall\'età arcaica: quello che l\'Anatolia fa non è coniarlo, è fissarlo al maschile e farne un teonimo. E tre testi lontanissimi fra loro — Filocoro via Macrobio (T14), l\'inno orfico (T10), l\'Historia Augusta (T17) — convergono nel dire che il genere della divinità lunare non era percepito come stabile.',
    'Resta l\'asimmetria da cui la sezione è nata. Un lessico dell\'acculturazione religiosa come LARES lavora sui testi e trova la luna ovunque; ILA lavora sulla pietra e trova Men ovunque; e i due insiemi si sfiorano appena. La sezione «Fonti letterarie» esiste per rendere questo scarto visibile e misurabile invece di lasciarlo implicito — e per fornire, a chi legge una stele di Axiotta, il contesto lessicale entro cui il nome inciso acquista senso.',
  ],

  bibliografia: [
    'E. N. Lane, Corpus Monumentorum Religionis Dei Menis (CMRDM), I–IV, Leiden 1971–1978.',
    'E. N. Lane, «Men: A Neglected Cult of Roman Asia Minor», ANRW II.18.3, 1990, pp. 2161–2174.',
    'H. W. Pleket, «Religious History as the History of Mentality», in H. S. Versnel (ed.), Faith, Hope and Worship, Leiden 1981.',
    'G. Petzl, Die Beichtinschriften Westkleinasiens, Epigraphica Anatolica 22, Bonn 1994.',
    'A. Chaniotis, «Under the Watchful Eyes of the Gods», in S. Colvin (ed.), The Greco-Roman East, Cambridge 2004.',
    'W. Burkert, Griechische Religion der archaischen und klassischen Epoche, Stuttgart 1977.',
    'M. L. West, Hesiod. Theogony, Oxford 1966.',
    'A. S. F. Gow, Theocritus, I–II, Cambridge 1952².',
    'LARES — Language and Religion. Lexical Change and Variation in Religious Enculturation / Acculturation phenomena of the Ancient World, site.unibo.it/lares ; lares-lexicon.unibo.it.',
  ],

  redazione: 'Gabriele Gregorio',
  aggiornamento: '2026-08-31',
  vociCollegate: ['Men (Μήν)', 'Lunus', 'Ecate', 'Attis', 'Sabazio', 'Artemide'],
};

export const VOCI: Voce[] = [VOCE_SELENE];

/**
 * Voci previste e non ancora redatte. Compaiono nell'indice, disattivate:
 * l'elenco deve dire anche che cosa manca, non solo che cosa c'è.
 */
export const VOCI_IN_PREPARAZIONE: VoceInPreparazione[] = [
  { lemma: 'Men', lemmaGreco: 'Μήν', nota: 'il dio lunare anatolico: la voce speculare a Selene, e la più vicina al corpus' },
  { lemma: 'Lunus', nota: 'il maschile latino della luna, fra Carre e l’erudizione tardoantica' },
  { lemma: 'Ecate', lemmaGreco: 'Ἑκάτη', nota: 'l’assimilazione lunare nella magia e negli inni' },
  { lemma: 'Attis', nota: 'Menotyrannus nelle iscrizioni tardo-romane: culto metroaco e luna' },
  { lemma: 'Sabazio', lemmaGreco: 'Σαβάζιος', nota: 'le associazioni cultuali anatoliche' },
  { lemma: 'Artemide', lemmaGreco: 'Ἄρτεμις', nota: 'la sovrapposizione lunare classica' },
];
