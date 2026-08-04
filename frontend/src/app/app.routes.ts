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
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
