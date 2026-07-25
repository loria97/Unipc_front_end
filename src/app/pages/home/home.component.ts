import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { HoverDirective } from '../../directives/hover.directive';
import { UiLogoComponent } from '../../components/ui-logo/ui-logo.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, NgIf, HoverDirective, UiLogoComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  area = 'Tutti';
  counts = [0, 0, 0, 0, 0];
  submitted = false;

  @ViewChild('newsTrack') newsTrack?: ElementRef<HTMLElement>;
  @ViewChild('statsEl') statsEl?: ElementRef<HTMLElement>;

  private io?: IntersectionObserver;
  private statsIo?: IntersectionObserver;
  private raf = 0;
  private submitTimer: any;

  heroStats = [
    { n: '12.400+', l: 'Studenti iscritti' },
    { n: '98%', l: 'Soddisfazione' },
    { n: '24/7', l: 'Piattaforma attiva' },
  ];

  news = [
    { tag: 'Bando', tagColor: 'var(--unipc-primary)', date: '18 feb 2026', title: 'Bando Borse di Studio 2026', desc: "Aperte le domande per le borse di studio a copertura totale o parziale della retta per l'A.A. 2025/2026.", file: 'assets/docs/bando-borse-2026.pdf', docType: 'il bando (PDF)', size: '· 240 KB' },
    { tag: 'Concorso', tagColor: '#8A6D1F', date: '12 feb 2026', title: 'Concorso per 12 Tutor Didattici', desc: "Selezione pubblica per titoli ed esami per l'affidamento di incarichi di tutoraggio online.", file: 'assets/docs/concorso-tutor.pdf', docType: 'il documento', size: '· 180 KB' },
    { tag: 'Documento', tagColor: 'var(--unipc-success)', date: '05 feb 2026', title: 'Calendario Esami 2025/2026', desc: "Pubblicato il calendario completo delle sessioni d'esame telematiche e in sede per tutti i corsi.", file: 'assets/docs/calendario-esami.pdf', docType: 'il calendario', size: '· 96 KB' },
    { tag: 'Informazione', tagColor: '#5B6675', date: '28 gen 2026', title: 'Regolamento Tasse e Contributi', desc: "Importi, scadenze delle rate, agevolazioni ISEE e modalità di pagamento per l'anno accademico.", file: 'assets/docs/regolamento-tasse.pdf', docType: 'il regolamento', size: '· 120 KB' },
    { tag: 'Avviso', tagColor: 'var(--unipc-danger)', date: '20 gen 2026', title: 'Immatricolazioni 2026 aperte', desc: 'Al via le iscrizioni ai corsi di laurea, magistrali e master. Riconoscimento CFU su valutazione.', file: 'assets/docs/avviso-immatricolazioni.pdf', docType: "l'avviso", size: '· 88 KB' },
  ];

  categories = [
    { code: 'L', title: 'Lauree Triennali', desc: 'Percorsi di primo livello in economia, diritto, scienze politiche e motorie.', cta: 'Vedi le triennali' },
    { code: 'LM', title: 'Lauree Magistrali', desc: 'Specializzati con una laurea magistrale interamente online.', cta: 'Vedi le magistrali' },
    { code: 'LMG', title: 'Giurisprudenza (Ciclo Unico)', desc: "Il percorso quinquennale LMG/01 per l'accesso alle professioni legali.", cta: 'Scopri il corso' },
    { code: 'M', title: 'Master', desc: 'Master di I e II livello per crescere nel tuo settore professionale.', cta: 'Vedi i master' },
    { code: 'CS', title: 'Corsi Singoli', desc: 'Acquisisci CFU su singoli insegnamenti per concorsi e integrazioni.', cta: 'Vedi i corsi singoli' },
    { code: '◈', title: 'Certificazioni', desc: 'Certificazioni linguistiche e informatiche riconosciute e spendibili.', cta: 'Vedi le certificazioni' },
  ];

  numbersData = [
    { target: 9, label: 'Lauree Triennali' },
    { target: 7, label: 'Lauree Magistrali' },
    { target: 24, label: 'Master di I e II livello' },
    { target: 15, label: 'Certificazioni' },
    { target: 5, label: 'Sedi in Italia' },
  ];

  benefits = [
    { title: 'CFU riconosciuti e agevolazioni', desc: 'Valutiamo la tua carriera pregressa per riconoscere crediti e proporti agevolazioni sulla retta.' },
    { title: 'Tutor dedicati', desc: "Un tutor personale ti segue dall'immatricolazione alla laurea." },
    { title: 'Piattaforma e-learning 24/7', desc: 'Lezioni e materiali sempre disponibili, da qualsiasi dispositivo.' },
    { title: 'Esami in modalità telematica', desc: "Sostieni gli esami online o nelle sedi, con sessioni durante tutto l'anno." },
    { title: 'Assistenza burocratica', desc: 'Ti supportiamo nelle pratiche prima e dopo l\'immatricolazione.' },
  ];

  elearning = ['Lezioni registrate, sempre accessibili', 'Materiale didattico scaricabile', 'Nessuno spostamento necessario', 'Compatibile con lavoro e famiglia'];

  coursesData = [
    { cat: 'Triennale · L-18', title: 'Economia Aziendale', cfu: '180', durata: '3 anni', mod: 'Online', area: 'Economica' },
    { cat: 'Magistrale · LM-77', title: 'Management e Innovazione', cfu: '120', durata: '2 anni', mod: 'Online', area: 'Economica' },
    { cat: 'Ciclo Unico · LMG/01', title: 'Giurisprudenza', cfu: '300', durata: '5 anni', mod: 'Online', area: 'Giuridica' },
    { cat: 'Triennale · L-22', title: 'Scienze Motorie', cfu: '180', durata: '3 anni', mod: 'Blended', area: 'Sanitaria' },
    { cat: 'Triennale · L-36', title: 'Scienze Politiche', cfu: '180', durata: '3 anni', mod: 'Online', area: 'Politico-sociale' },
    { cat: 'Master · II livello', title: 'Management Sanitario', cfu: '60', durata: '1 anno', mod: 'Online', area: 'Sanitaria' },
  ];

  steps = [
    { n: '1', title: 'Orientamento gratuito', desc: 'Parli con un orientatore che ti aiuta a scegliere il corso.' },
    { n: '2', title: 'Valutazione CFU', desc: 'Analizziamo la tua carriera per riconoscere crediti pregressi.' },
    { n: '3', title: 'Immatricolazione', desc: "Completi l'iscrizione online in pochi minuti, assistito dai tutor." },
    { n: '4', title: 'Inizio del percorso', desc: 'Accedi alla piattaforma e cominci subito a studiare.' },
  ];

  testimonials = [
    { quote: 'Ho conseguito la laurea lavorando a tempo pieno. I tutor mi hanno seguito in ogni esame.', name: 'Giulia Ferraro', role: 'Laureata in Economia Aziendale' },
    { quote: 'Materiale sempre disponibile e piattaforma chiara: studiare online è stato semplice.', name: 'Antonio Muro', role: 'Studente di Scienze Politiche' },
    { quote: 'Con il riconoscimento dei CFU ho ridotto i tempi e completato la magistrale.', name: 'Chiara De Luca', role: 'Laureata in Management' },
  ];

  sedi = [
    { city: 'Crotone', addr: 'Via Magna Grecia 12' },
    { city: 'Roma', addr: 'Via del Corso 100' },
    { city: 'Milano', addr: 'Corso Buenos Aires 45' },
    { city: 'Napoli', addr: 'Via Toledo 210' },
    { city: 'Palermo', addr: 'Via Maqueda 88' },
  ];

  pins = [
    { city: 'Milano', top: '14%', left: '34%' },
    { city: 'Roma', top: '46%', left: '44%' },
    { city: 'Napoli', top: '56%', left: '54%' },
    { city: 'Crotone', top: '72%', left: '68%' },
    { city: 'Palermo', top: '84%', left: '44%' },
  ];

  areas = ['Tutti', 'Economica', 'Giuridica', 'Sanitaria', 'Politico-sociale'];

  constructor(private host: ElementRef<HTMLElement>) {}

  get areaFilters() {
    return this.areas.map((a) => {
      const active = this.area === a;
      return {
        label: a,
        active,
        bg: active ? 'var(--unipc-primary)' : '#fff',
        color: active ? '#fff' : 'var(--unipc-ink)',
        border: active ? 'var(--unipc-primary)' : 'var(--unipc-border)',
      };
    });
  }
  get visibleCourses() {
    return this.coursesData.filter((c) => this.area === 'Tutti' || c.area === this.area);
  }
  get numbers() {
    return this.numbersData.map((n, i) => ({ display: String(this.counts[i]), label: n.label }));
  }

  setArea(a: string): void { this.area = a; }

  private scrollNews(dir: number): void {
    const t = this.newsTrack?.nativeElement;
    if (!t) return;
    const card = t.querySelector('article');
    const step = card ? card.getBoundingClientRect().width + 24 : t.clientWidth * 0.85;
    t.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  newsPrev(): void { this.scrollNews(-1); }
  newsNext(): void { this.scrollNews(1); }

  onSubmit(e: Event): void {
    e.preventDefault();
    this.submitted = true;
    clearTimeout(this.submitTimer);
    this.submitTimer = setTimeout(() => (this.submitted = false), 4000);
  }

  ngAfterViewInit(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = this.host.nativeElement;

    if (!reduce && 'IntersectionObserver' in window) {
      this.io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).style.opacity = '1';
              (e.target as HTMLElement).style.transform = 'none';
              this.io!.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(18px)';
          el.style.transition = 'opacity .55s var(--ease), transform .55s var(--ease)';
          this.io!.observe(el);
        });
      });
    }

    const statsEl = this.statsEl?.nativeElement;
    if (statsEl) {
      if (reduce || !('IntersectionObserver' in window)) { this.finishCounts(); return; }
      this.statsIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { this.runCounters(); this.statsIo!.disconnect(); }
          });
        },
        { threshold: 0.35 }
      );
      this.statsIo.observe(statsEl);
    }
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.statsIo?.disconnect();
    cancelAnimationFrame(this.raf);
    clearTimeout(this.submitTimer);
  }

  private finishCounts(): void { this.counts = this.numbersData.map((n) => n.target); }
  private runCounters(): void {
    const dur = 1300;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      this.counts = this.numbersData.map((n) => Math.round(n.target * eased));
      if (p < 1) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}
