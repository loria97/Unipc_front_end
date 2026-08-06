import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LEGAL_ENTITY } from '../../core/consent/legal-entity';
import { CookiePreferencesService } from '../../core/services/cookie-preferences.service';
import { HoverDirective } from '../../shared/directives/hover.directive';
import { UiLogoComponent } from '../../shared/components/ui-logo/ui-logo.component';

@Component({
  selector: 'unipc-footer',
  standalone: true,
  imports: [NgFor, HoverDirective, UiLogoComponent, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private readonly cookiePreferences = inject(CookiePreferencesService);

  // Dati reali, centralizzati in `core/consent/legal-entity.ts`: footer e
  // pagine legali leggono dalla stessa costante, non possono divergere.
  readonly legalEntity = LEGAL_ENTITY;

  social = [
    { label: 'Facebook', abbr: 'Fb' },
    { label: 'Instagram', abbr: 'Ig' },
    { label: 'LinkedIn', abbr: 'In' },
    { label: 'YouTube', abbr: 'Yt' },
  ];
  footerCourses = ['Lauree Triennali', 'Lauree Magistrali', 'Giurisprudenza (Ciclo Unico)', 'Master', 'Certificazioni'];
  footerServices = ['Area riservata', 'Segreteria studenti', 'Orientamento', 'Placement', 'Biblioteca digitale'];

  openCookiePreferences(): void {
    this.cookiePreferences.open();
  }
}
