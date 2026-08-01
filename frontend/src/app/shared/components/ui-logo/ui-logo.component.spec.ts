import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiLogoComponent } from './ui-logo.component';

describe('UiLogoComponent', () => {
  let fixture: ComponentFixture<UiLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiLogoComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
