import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PlaceholderDashboardComponent } from './features/dashboard/placeholder-dashboard.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'dashboard',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'chores',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'approvals',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'rewards',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'leaderboard',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'analytics',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
];
