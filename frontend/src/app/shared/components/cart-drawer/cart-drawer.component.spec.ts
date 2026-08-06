import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CartItem } from '../../../core/models/cart.model';
import type { DataError } from '../../../core/models/data-result';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerComponent } from './cart-drawer.component';

/**
 * Doppio minimale di `CartService`: solo i signal/metodi letti dal template
 * di `CartContentComponent`, annidato nel drawer. Stesso stile del fake in
 * `cart-content.component.spec.ts`.
 */
class FakeCartService {
  readonly isLoading = signal(false);
  readonly loadError = signal<DataError | null>(null);
  readonly items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);
  readonly totalCents = signal(0);

  removedSlugs: string[] = [];
  retryCount = 0;

  remove(slug: string): void {
    this.removedSlugs.push(slug);
  }

  retryLoad(): void {
    this.retryCount += 1;
  }
}

describe('CartDrawerComponent', () => {
  let fixture: ComponentFixture<CartDrawerComponent>;
  let drawerService: CartDrawerService;

  function resetBodyStyle(): void {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }

  beforeEach(async () => {
    resetBodyStyle();

    await TestBed.configureTestingModule({
      imports: [CartDrawerComponent],
      providers: [provideRouter([]), { provide: CartService, useValue: new FakeCartService() }],
    }).compileComponents();

    fixture = TestBed.createComponent(CartDrawerComponent);
    drawerService = TestBed.inject(CartDrawerService);
  });

  afterEach(() => {
    resetBodyStyle();
  });

  it('il backdrop è un vero <button>, non un div con click handler', fakeAsync(() => {
    drawerService.open();
    fixture.detectChanges();
    tick(50);

    const backdrop = fixture.nativeElement.querySelector('.drawer__backdrop');
    expect(backdrop?.tagName).toBe('BUTTON');
  }));

  it('apre: blocca lo scroll del body e sposta il focus sul pulsante di chiusura', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    drawerService.open();
    fixture.detectChanges();
    tick(50);

    expect(document.body.style.position).toBe('fixed');
    const closeButton: HTMLElement = fixture.nativeElement.querySelector('.drawer__close');
    expect(document.activeElement).toBe(closeButton);

    document.body.removeChild(trigger);
  }));

  it('chiude: ripristina lo scroll e riporta il focus sull\'elemento che aveva aperto il drawer', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    drawerService.open();
    fixture.detectChanges();
    tick(50);

    drawerService.close();
    fixture.detectChanges();
    tick(50);

    expect(document.body.style.position).toBe('');
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  }));

  it('Esc chiude il drawer quando è aperto', fakeAsync(() => {
    drawerService.open();
    fixture.detectChanges();
    tick(50);
    expect(drawerService.isOpen()).toBeTrue();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick(50);

    expect(drawerService.isOpen()).toBeFalse();
  }));

  it('il pannello ha role="dialog", aria-modal e aria-labelledby verso un titolo presente', fakeAsync(() => {
    drawerService.open();
    fixture.detectChanges();
    tick(50);

    const panel: HTMLElement = fixture.nativeElement.querySelector('.drawer__panel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    const labelledBy = panel.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`#${labelledBy}`)).not.toBeNull();
  }));
});
