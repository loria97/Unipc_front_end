import { Routes } from '@angular/router';

export const CORSI_PROFESSIONALIZZANTI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./corsi-professionalizzanti.component').then(
        (m) => m.CorsiProfessionalizzantiComponent,
      ),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./course-detail/course-detail.component').then((m) => m.CourseDetailComponent),
  },
];
