import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FocusTrapDirective } from './focus-trap.directive';

@Component({
  standalone: true,
  imports: [FocusTrapDirective],
  template: `
    <div class="panel" [unipcFocusTrap]="true" focusTrapInitialFocus=".first" [focusTrapReturnTo]="returnTo">
      <button type="button" class="first">Primo</button>
      <button type="button" class="second">Secondo</button>
      <button type="button" class="last">Ultimo</button>
    </div>
  `,
})
class HostComponent {
  returnTo: HTMLElement | null = null;
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  function resetBodyStyle(): void {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }

  beforeEach(() => {
    resetBodyStyle();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    resetBodyStyle();
  });

  it("blocca lo scroll del body e sposta il focus sull'elemento iniziale indicato", fakeAsync(() => {
    fixture.detectChanges();
    tick(50);

    expect(document.body.style.position).toBe('fixed');
    const first: HTMLElement = fixture.nativeElement.querySelector('.first');
    expect(document.activeElement).toBe(first);
  }));

  it('Tab dall\'ultimo elemento del ciclo torna al primo', fakeAsync(() => {
    fixture.detectChanges();
    tick(50);

    const last: HTMLElement = fixture.nativeElement.querySelector('.last');
    const first: HTMLElement = fixture.nativeElement.querySelector('.first');
    last.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBeTrue();
  }));

  it("Shift+Tab dal primo elemento del ciclo torna all'ultimo", fakeAsync(() => {
    fixture.detectChanges();
    tick(50);

    const last: HTMLElement = fixture.nativeElement.querySelector('.last');
    const first: HTMLElement = fixture.nativeElement.querySelector('.first');
    first.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(document.activeElement).toBe(last);
  }));

  it('Tab da un elemento fuori dal pannello (es. un backdrop fratello) rientra nel ciclo', fakeAsync(() => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    fixture.detectChanges();
    tick(50);
    // Il focus iniziale automatico sposta comunque il fuoco dentro al
    // pannello: lo riportiamo manualmente fuori per simulare il caso reale
    // (focus rimasto sul backdrop dopo un click).
    outside.focus();

    const first: HTMLElement = fixture.nativeElement.querySelector('.first');
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(first);

    document.body.removeChild(outside);
  }));

  it('alla distruzione sblocca lo scroll e riporta il focus al trigger indicato', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    fixture.componentInstance.returnTo = trigger;
    fixture.detectChanges();
    tick(50);
    expect(document.body.style.position).toBe('fixed');

    fixture.destroy();
    tick(50);

    expect(document.body.style.position).toBe('');
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  }));

  it('due overlay aperti in sequenza: lo scroll resta bloccato finché anche il secondo non si chiude', fakeAsync(() => {
    const second = TestBed.createComponent(HostComponent);

    fixture.detectChanges();
    tick(50);
    second.detectChanges();
    tick(50);
    expect(document.body.style.position).toBe('fixed');

    fixture.destroy();
    tick(50);
    expect(document.body.style.position).toBe('fixed'); // il secondo overlay è ancora aperto

    second.destroy();
    tick(50);
    expect(document.body.style.position).toBe('');
  }));
});
