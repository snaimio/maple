import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ParentDashboardComponent } from './features/dashboard/parent-dashboard.component';
import { ChildDashboardComponent } from './features/dashboard/child-dashboard.component';
import { PlaceholderDashboardComponent } from './features/dashboard/placeholder-dashboard.component';
import { ChoreBoardComponent } from './features/chores/chore-board.component';
import { ApprovalsQueueComponent } from './features/completions/approvals-queue.component';
import { RewardsComponent } from './features/rewards/rewards.component';
import { LeaderboardComponent } from './features/leaderboard/leaderboard.component';
import { CreateComponent } from './features/household/create/create.component';
import { JoinComponent } from './features/household/join/join.component';
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
    path: 'households/create',
    component: CreateComponent,
    canActivate: [authGuard],
  },
  {
    path: 'households/join',
    component: JoinComponent,
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    component: ParentDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'child-dashboard',
    component: ChildDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'chores',
    component: ChoreBoardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'approvals',
    component: ApprovalsQueueComponent,
    canActivate: [authGuard],
  },
  {
    path: 'rewards',
    component: RewardsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'leaderboard',
    component: LeaderboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'analytics',
    component: PlaceholderDashboardComponent,
    canActivate: [authGuard],
  },
];
