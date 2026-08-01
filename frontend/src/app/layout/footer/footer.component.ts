import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { HoverDirective } from '../../shared/directives/hover.directive';
import { UiLogoComponent } from '../../shared/components/ui-logo/ui-logo.component';

@Component({
  selector: 'unipc-footer',
  standalone: true,
  imports: [NgFor, HoverDirective, UiLogoComponent],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  social = [
    { label: 'Facebook', abbr: 'Fb' },
    { label: 'Instagram', abbr: 'Ig' },
    { label: 'LinkedIn', abbr: 'In' },
    { label: 'YouTube', abbr: 'Yt' },
  ];
  footerCourses = ['Lauree Triennali', 'Lauree Magistrali', 'Giurisprudenza (Ciclo Unico)', 'Master', 'Certificazioni'];
  footerServices = ['Area riservata', 'Segreteria studenti', 'Orientamento', 'Placement', 'Biblioteca digitale'];
}
