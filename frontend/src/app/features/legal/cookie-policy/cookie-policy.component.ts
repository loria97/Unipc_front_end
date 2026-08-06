import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { cookieTableRows } from '../../../core/consent/cookie-table';
import { LEGAL_ENTITY } from '../../../core/consent/legal-entity';
import { THIRD_PARTY_SERVICES } from '../../../core/consent/third-party-services';

/**
 * Cookie policy: la tabella dei servizi è **generata** dal registro
 * (`cookieTableRows`), mai scritta a mano — cambia il registro, cambia la
 * tabella. Contrassegnata BOZZA finché non validata dal legale
 * dell'ateneo (vedi commento HTML in cima al template, visibile anche in
 * view-source).
 */
@Component({
  selector: 'unipc-cookie-policy',
  standalone: true,
  imports: [NgFor, RouterLink],
  templateUrl: './cookie-policy.component.html',
  styleUrl: './cookie-policy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiePolicyComponent {
  private readonly registry = inject(THIRD_PARTY_SERVICES);
  private readonly titleService = inject(Title);

  readonly rows = cookieTableRows(this.registry);
  readonly legalEntity = LEGAL_ENTITY;

  constructor() {
    this.titleService.setTitle('Cookie Policy — UNIPC');
  }
}
