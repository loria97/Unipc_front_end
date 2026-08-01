import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './pages/home/home.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, HomeComponent],
  template: `
    <div style="min-height:100vh;background:var(--unipc-surface);">
      <app-header></app-header>
      <app-home></app-home>
      <app-footer></app-footer>
    </div>
  `,
})
export class AppComponent {}
