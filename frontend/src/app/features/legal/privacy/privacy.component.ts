import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LEGAL_ENTITY } from '../../../core/consent/legal-entity';

/**
 * Privacy policy, struttura artt. 13-14 GDPR. Contrassegnata BOZZA finché
 * non validata dal legale dell'ateneo (vedi commento HTML in cima al
 * template, visibile anche in view-source). I dati identificativi vengono
 * da `legal-entity.ts`, la stessa costante letta dal footer.
 */
@Component({
  selector: 'unipc-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  private readonly titleService = inject(Title);

  readonly legalEntity = LEGAL_ENTITY;

  constructor() {
    this.titleService.setTitle('Privacy Policy — UNIPC');
  }
}
