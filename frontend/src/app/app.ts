import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';

/**
 * Navigation item representation for the app navbar.
 */
export interface NavLink {
  label: string;
  path: string;
  icon: string;
}

/**
 * Root application component implementing the Maple top navigation shell and view outlet.
 *
 * Provides responsive navigation, displays active user details, and manages user logout.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Signal containing the authenticated user or null.
   */
  readonly currentUser = this.authService.currentUser;

  /**
   * Computed boolean indicating if an authenticated session is active.
   */
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  /**
   * State controlling visibility of the mobile slide-down menu.
   */
  readonly mobileMenuOpen = signal(false);

  /**
   * Main navigation routes with SVG icon path data.
   */
  readonly navLinks: NavLink[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zM3 14h7v7H3z',
    },
    {
      label: 'Chores',
      path: '/chores',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    },
    {
      label: 'Approvals',
      path: '/approvals',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Rewards',
      path: '/rewards',
      icon: 'M12 8v13m0-13V3m0 5H5a2 2 0 00-2 2v1a2 2 0 002 2h14a2 2 0 002-2v-1a2 2 0 00-2-2h-7zm0 0H7.5a2.5 2.5 0 010-5C11 3 12 8 12 8zm0 0h4.5a2.5 2.5 0 000-5C13 3 12 8 12 8zM5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    },
    {
      label: 'Leaderboard',
      path: '/leaderboard',
      icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: 'M3 3v18h18M7 16l4-4 4 4 6-6',
    },
  ];

  ngOnInit(): void {
    const url = this.router.url;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthRoute =
      url === '/login' ||
      url === '/register' ||
      path === '/login' ||
      path === '/register' ||
      path.startsWith('/login') ||
      path.startsWith('/register');

    // If authenticated user is on login/register, redirect to dashboard
    if (this.currentUser() && isAuthRoute) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Listen for client-side navigation to login/register while authenticated
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const targetUrl = event.urlAfterRedirects || event.url;
        if (this.currentUser() && (targetUrl === '/login' || targetUrl === '/register')) {
          this.router.navigate(['/dashboard']);
        }
      });

    // Do not run session check on the login/register page
    if (isAuthRoute) {
      return;
    }

    if (this.authService.isLoggingIn() || this.authService.justLoggedIn()) {
      return;
    }

    // Only check session on cold start
    if (!this.currentUser()) {
      this.authService.me().subscribe({
        error: () => {
          // Unauthenticated session, handled by auth guard
        },
      });
    }
  }

  /**
   * Toggles the mobile navigation menu open/close state.
   */
  toggleMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  /**
   * Closes the mobile navigation menu.
   */
  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * Generates initials for the user avatar from display_name.
   *
   * @returns Initials string (1 or 2 uppercase letters)
   */
  getUserInitials(): string {
    const name = this.currentUser()?.display_name?.trim();
    if (!name) return 'M';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /**
   * Logs out the user and redirects to the login screen.
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.closeMenu();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.closeMenu();
        this.router.navigate(['/login']);
      },
    });
  }
}
