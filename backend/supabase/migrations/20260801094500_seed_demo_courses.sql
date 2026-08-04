-- DATI DI ESEMPIO (demo). Questa migration va eliminata/sostituita quando arrivano
-- i corsi reali del catalogo. I tre record hanno prefisso [DEMO] nel titolo per
-- essere riconoscibili e rimovibili senza ambiguità.

insert into public.courses (
  slug, title, type, area, abstract, hero_image,
  a_chi_e_rivolto, obiettivi, requisiti_ammissione,
  durata_ore, durata_label, cfu, modalita,
  list_price_cents, promo_price_cents, promo_label, promo_valid_until, vat_regime,
  riferimenti_normativi, punti_graduatoria, classi_concorso,
  published, sort_order, seo
) values (
  'didattica-digitale-inclusione-scolastica',
  '[DEMO] Corso di Perfezionamento in Didattica Digitale e Inclusione Scolastica',
  'corso',
  'Formazione Insegnanti',
  'Un percorso di perfezionamento annuale per acquisire competenze avanzate di didattica digitale e inclusione, valido per punteggio nelle graduatorie GPS.',
  '{"src": "/assets/img/corsi/didattica-digitale-inclusione-hero.jpg", "alt": "Docente che utilizza una lavagna digitale interattiva in classe"}'::jsonb,
  array[
    'Il corso è rivolto a docenti di ogni ordine e grado, già in servizio o aspiranti, che desiderano approfondire le metodologie della didattica digitale e dell''inclusione scolastica.',
    'È indicato anche per educatori, pedagogisti e operatori dei servizi socio-educativi interessati ad ampliare le proprie competenze in ambito tecnologico e inclusivo.'
  ],
  array[
    'Fornire strumenti operativi per progettare percorsi didattici digitali accessibili a tutti gli studenti, incluso chi ha bisogni educativi speciali.',
    'Sviluppare competenze nell''uso di piattaforme e-learning, strumenti compensativi e tecnologie assistive in classe.'
  ],
  array[
    'Diploma di laurea triennale, magistrale o vecchio ordinamento, oppure diploma di scuola secondaria di secondo grado per i profili non docenti.',
    'Non sono richiesti requisiti ulteriori: il corso è aperto anche a chi è già in possesso di altri titoli di perfezionamento. Il riconoscimento dei crediti ai fini delle <strong>Graduatorie Provinciali per le Supplenze (GPS)</strong> avviene secondo quanto previsto dal <a href="https://www.miur.gov.it/normativa">D.M. 22 novembre 2019, n. 995</a>.'
  ],
  1500,
  '1500 ore / 60 CFU',
  60,
  'E-learning asincrono, piattaforma FAD con tutor dedicato e verifiche periodiche',
  60000,
  49900,
  'Promo Iscrizioni Anticipate',
  '2026-12-31',
  'esente_art10',
  '[
    {"label": "D.M. 22 novembre 2019, n. 995 - Tabella di valutazione titoli GPS", "url": "https://www.miur.gov.it/documents/20182/0/DM+995_19.pdf"},
    {"label": "Nota MIM prot. 25089 del 10 giugno 2025 - Aggiornamento graduatorie provinciali", "url": "https://www.miur.gov.it/normativa/nota-25089-2025"}
  ]'::jsonb,
  '{"punti": 3, "note": "Valido per le Graduatorie Provinciali per le Supplenze (GPS), II fascia, ambito Sostegno, secondo la tabella di valutazione titoli vigente."}'::jsonb,
  array['ADSS - Sostegno Scuola Secondaria di Primo Grado', 'ADSH - Sostegno Scuola Secondaria di Secondo Grado'],
  true,
  1,
  '{"metaTitle": "Corso Didattica Digitale e Inclusione Scolastica | UNIPC", "metaDescription": "Corso di perfezionamento in didattica digitale e inclusione scolastica, 60 CFU, valido per punteggio GPS. Iscrizioni online."}'::jsonb
)
on conflict (slug) do nothing;

insert into public.courses (
  slug, title, type, area, abstract, hero_image,
  a_chi_e_rivolto, obiettivi, requisiti_ammissione,
  durata_ore, durata_label, cfu, modalita,
  list_price_cents, vat_regime,
  published, sort_order, seo
) values (
  'certificazione-competenze-digitali-base',
  '[DEMO] Certificazione Informatica di Base - Competenze Digitali Essenziali',
  'certificazione',
  'Informatica',
  'Certificazione delle competenze digitali di base, pensata per chi deve dimostrare in modo rapido ed economico il possesso di abilità informatiche essenziali.',
  '{"src": "/assets/img/corsi/certificazione-competenze-digitali-hero.jpg", "alt": "Persona che sostiene un test al computer in una postazione d''esame"}'::jsonb,
  array[
    'La certificazione è rivolta a studenti, lavoratori e chiunque debba attestare in modo formale le proprie competenze digitali di base per motivi di studio o di lavoro.',
    'È particolarmente indicata per chi partecipa a concorsi pubblici o bandi che richiedono una certificazione informatica riconosciuta tra i titoli valutabili.'
  ],
  array[
    'Verificare la conoscenza dei concetti fondamentali dell''informatica, della navigazione in rete e dell''uso della posta elettronica.',
    'Attestare la capacità di utilizzare in autonomia i principali strumenti di videoscrittura, foglio di calcolo e presentazione.'
  ],
  array[
    'Nessun titolo di studio specifico richiesto: la certificazione è aperta a tutti i maggiorenni.',
    'È necessario disporre di un computer con webcam e connessione internet stabile per sostenere l''esame in modalità proctored.'
  ],
  30,
  '30 ore di preparazione facoltativa + esame',
  null,
  'Esame online in videosorveglianza (proctoring), disponibile su prenotazione',
  6900,
  'esente_art10',
  true,
  2,
  '{"metaTitle": "Certificazione Competenze Digitali di Base | UNIPC", "metaDescription": "Certificazione informatica di base, esame online in videosorveglianza. Attestato valido come titolo per concorsi pubblici."}'::jsonb
)
on conflict (slug) do nothing;

insert into public.courses (
  slug, title, type, area, abstract, hero_image,
  a_chi_e_rivolto, obiettivi, requisiti_ammissione, programma,
  durata_ore, durata_label, cfu, modalita, prove_previste,
  list_price_cents, vat_regime,
  published, sort_order, seo
) values (
  'alta-formazione-management-organizzazioni-sanitarie-sociosanitarie',
  '[DEMO] Corso di Alta Formazione in Management delle Organizzazioni Sanitarie e Sociosanitarie per Professionisti della Salute e del Sociale',
  'corso',
  'Management Sanitario',
  'Un percorso executive per professionisti sanitari e sociosanitari che intendono sviluppare competenze manageriali e organizzative applicate al settore della salute.',
  '{"src": "/assets/img/corsi/management-sanitario-hero.jpg", "alt": "Gruppo di professionisti sanitari in riunione con documenti e grafici organizzativi"}'::jsonb,
  array[
    'Il corso è rivolto a medici, infermieri, professionisti sanitari e operatori del sociale che ricoprono o aspirano a ricoprire ruoli di coordinamento e gestione.',
    'È adatto anche a laureati in discipline economiche o giuridiche interessati a specializzarsi nella gestione di strutture sanitarie e sociosanitarie, pubbliche o private.'
  ],
  array[
    'Fornire competenze di programmazione, budgeting e controllo di gestione applicate alle organizzazioni sanitarie e sociosanitarie.',
    'Sviluppare capacità di leadership e di gestione dei team multidisciplinari in contesti sanitari complessi.'
  ],
  array[
    'Diploma di laurea triennale o magistrale in ambito sanitario, sociale, economico o giuridico.',
    'Titoli equipollenti conseguiti all''estero sono valutati dalla commissione didattica caso per caso.'
  ],
  array[
    'Modulo 1 - Fondamenti di management sanitario e quadro normativo del SSN',
    'Modulo 2 - Programmazione, budgeting e controllo di gestione',
    'Modulo 3 - Organizzazione dei servizi sociosanitari e percorsi assistenziali',
    'Modulo 4 - Leadership, comunicazione e gestione dei team',
    'Modulo 5 - Project work finale e discussione con la commissione'
  ],
  1000,
  '1000 ore / 40 CFU',
  40,
  'E-learning asincrono con tre giornate di project work in videoconferenza sincrona',
  array['Elaborato scritto intermedio', 'Project work finale con discussione orale'],
  90000,
  'esente_art10',
  true,
  3,
  '{"metaTitle": "Alta Formazione in Management Sanitario e Sociosanitario | UNIPC", "metaDescription": "Corso executive di alta formazione per professionisti della salute e del sociale: management, budgeting e leadership in ambito sanitario."}'::jsonb
)
on conflict (slug) do nothing;
