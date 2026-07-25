import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { HoverDirective } from '../../directives/hover.directive';
import { UiLogoComponent } from '../ui-logo/ui-logo.component';

interface MegaCol { title: string; links: string[]; }
interface MegaFeatured { cat: string; title: string; }
interface NavItem { label: string; mega?: { cols: MegaCol[]; featured: MegaFeatured[] }; }

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgFor, NgIf, HoverDirective, UiLogoComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  desktop = true;
  scrolled = false;
  mobileOpen = false;
  searchOpen = false;
  mega: number | null = null;
  mobileExpanded: Record<number, boolean> = {};

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  private mq?: MediaQueryList;
  private syncMq = () => (this.desktop = !!this.mq && this.mq.matches);
  private onScroll = () => {
    const s = window.scrollY > 20;
    if (s !== this.scrolled) this.scrolled = s;
  };

  nav: NavItem[] = [
    { label: 'HOME' },
    { label: 'CHI SIAMO' },
    { label: 'CORSI DI LAUREA', mega: { cols: [
      { title: 'Area economica', links: ['Economia Aziendale', 'Management e Innovazione', 'Scienze Bancarie'] },
      { title: 'Area giuridico-sociale', links: ['Scienze dei Servizi Giuridici', 'Scienze Politiche', 'Sociologia'] },
    ], featured: [
      { cat: 'Triennale · L-18', title: 'Economia Aziendale' },
      { cat: 'Magistrale · LM-77', title: 'Management e Innovazione' },
    ] } },
    { label: 'MASTER', mega: { cols: [
      { title: 'Master universitari', links: ['Master di I livello', 'Master di II livello', 'Alta Formazione', 'Corsi di Perfezionamento'] },
    ], featured: [
      { cat: 'I livello', title: 'Management Sanitario' },
      { cat: 'II livello', title: "Diritto dell'Economia" },
    ] } },
    { label: 'MONDO SCUOLA', mega: { cols: [
      { title: 'Per docenti', links: ['Percorsi 60 CFU abilitanti', 'Certificazioni linguistiche', 'Certificazioni informatiche', 'Corsi di aggiornamento'] },
    ], featured: [
      { cat: 'Insegnamento', title: 'Percorsi 60 CFU abilitanti' },
      { cat: 'Concorsi', title: 'Preparazione TFA sostegno' },
    ] } },
    { label: 'AREA SANITARIA', mega: { cols: [
      { title: 'Professioni sanitarie', links: ['Infermieristica', 'Fisioterapia', 'Scienze Motorie', 'Master sanitari', 'ECM'] },
    ], featured: [
      { cat: 'Laurea', title: 'Scienze Motorie L-22' },
      { cat: 'ECM', title: 'Formazione continua sanitaria' },
    ] } },
    { label: 'PUBBLICA AMMINISTRAZIONE', mega: { cols: [
      { title: 'Per la PA', links: ['Corsi per concorsi', 'Formazione dipendenti pubblici', 'Aggiornamento professionale', 'Convenzioni enti'] },
    ], featured: [
      { cat: 'Concorsi', title: 'Preparazione concorsi pubblici' },
      { cat: 'Convenzioni', title: 'Formazione per enti locali' },
    ] } },
    { label: 'CORSI PROFESSIONALIZZANTI' },
    { label: 'SERVIZI', mega: { cols: [
      { title: 'Servizi agli studenti', links: ['Segreteria studenti', 'Orientamento', 'Tutoraggio', 'Biblioteca digitale', 'Placement'] },
    ], featured: [
      { cat: 'Supporto', title: 'Sportello orientamento gratuito' },
      { cat: 'Carriera', title: 'Ufficio placement e stage' },
    ] } },
    { label: 'CONTATTI' },
  ];

  suggestions = ['Economia', 'Master sanitari', '60 CFU', 'Segreteria', 'Iscrizioni 2026'];

  ngAfterViewInit(): void {
    this.mq = window.matchMedia('(min-width: 1180px)');
    this.syncMq();
    this.mq.addEventListener('change', this.syncMq);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }
  ngOnDestroy(): void {
    if (this.mq) this.mq.removeEventListener('change', this.syncMq);
    window.removeEventListener('scroll', this.onScroll);
  }

  get barHeight(): string { return this.scrolled ? '64px' : '80px'; }
  get showMark(): boolean { return this.desktop && this.scrolled; }
  get showFull(): boolean { return !(this.desktop && this.scrolled); }
  get megaItem(): NavItem | null { return this.mega != null ? this.nav[this.mega] : null; }
  get megaOpen(): boolean { return !!(this.megaItem && this.megaItem.mega) && this.desktop; }

  subLinks(item: NavItem): string[] {
    return item.mega ? item.mega.cols.reduce((acc, c) => acc.concat(c.links), [] as string[]) : [];
  }
  rotate(i: number): string { return this.mobileExpanded[i] ? 'rotate(45deg)' : 'rotate(0deg)'; }

  setMega(i: number | null): void { this.mega = i; }
  closeMega(): void { this.mega = null; }
  toggleMobile(item: NavItem, i: number): void {
    if (!item.mega) { this.mobileOpen = false; return; }
    this.mobileExpanded = { ...this.mobileExpanded, [i]: !this.mobileExpanded[i] };
  }
  openSearch(): void {
    this.searchOpen = true;
    this.mobileOpen = false;
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }
  closeSearch(): void { this.searchOpen = false; }
  openMobile(): void { this.mobileOpen = true; }
  closeMobile(): void { this.mobileOpen = false; }
  stop(e: Event): void { e.stopPropagation(); }
}
