import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'corsi-professionalizzanti',
    loadChildren: () =>
      import('./features/corsi-professionalizzanti/corsi-professionalizzanti.routes').then(
        (m) => m.CORSI_PROFESSIONALIZZANTI_ROUTES,
      ),
  },
  {
    path: 'carrello',
    loadComponent: () =>
      import('./features/carrello/carrello.component').then((m) => m.CarrelloComponent),
  },
  {
    path: 'cookie-policy',
    loadComponent: () =>
      import('./features/legal/cookie-policy/cookie-policy.component').then((m) => m.CookiePolicyComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
