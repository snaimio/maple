import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { RewardManagerComponent } from './reward-manager.component';
import { RewardStoreComponent } from './reward-store.component';

/**
 * Shell component for Rewards feature.
 * Dispatches between the parent's Reward Manager (catalog & approvals)
 * and the child's Reward Store (browsing & redeeming) based on the user's household role.
 */
@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [RewardManagerComponent, RewardStoreComponent],
  template: `
    @if (currentHouseholdRole() === 'parent') {
      <app-reward-manager />
    } @else {
      <app-reward-store />
    }
  `,
})
export class RewardsComponent {
  private readonly authService = inject(AuthService);
  readonly currentHouseholdRole = this.authService.currentHouseholdRole;
}

