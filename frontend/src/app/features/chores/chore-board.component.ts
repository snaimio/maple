import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { Assignment, Chore } from '../../core/models';
import { ChoreFormComponent } from './chore-form.component';

interface BoardColumn {
  key: 'pending' | 'in_progress' | 'submitted' | 'approved';
  title: string;
  color: string;
  badgeBg: string;
}

/**
 * Chore Board (Kanban view) component for Maple.
 *
 * Visualizes chore assignments across four status columns:
 * Not Started, In Progress, Submitted, and Approved.
 * Provides interactive card inspection via modal with quick approvals.
 */
@Component({
  selector: 'app-chore-board',
  standalone: true,
  imports: [RouterLink, ChoreFormComponent],
  template: `
    <div class="board-page">
      <!-- Header -->
      <header class="board-header">
        <div>
          <h1 class="page-title">Chore Board</h1>
          <p class="page-subtitle">Track family chores and progress in real-time</p>
        </div>
        <div class="header-actions">
          @if (currentHouseholdRole() === 'parent') {
            <button type="button" class="btn-primary" (click)="onNewChore()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              + New Chore
            </button>
          }
        </div>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading chore board...</p>
        </div>
      } @else if (error(); as errMessage) {
        <!-- Error State -->
        <div class="error-card">
          <div class="error-icon">⚠️</div>
          <div class="error-content">
            <h3>Unable to load chore board</h3>
            <p>{{ errMessage }}</p>
            <div class="error-actions">
              @if (!authService.currentHouseholdId()) {
                <a routerLink="/households/create" class="btn-primary">Create Household</a>
                <a routerLink="/households/join" class="btn-secondary">Join Household</a>
              } @else {
                <button type="button" class="btn-primary" (click)="loadBoardData()">
                  Retry
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Kanban Grid -->
        <div class="kanban-grid">
          @for (col of columns; track col.key) {
            <div class="kanban-column">
              <!-- Column Header -->
              <div class="column-header">
                <div class="column-title-group">
                  <span class="status-dot" [style.background-color]="col.color"></span>
                  <h2 class="column-title">{{ col.title }}</h2>
                </div>
                <span
                  class="column-count"
                  [style.background-color]="col.badgeBg"
                  [style.color]="col.color"
                >
                  {{ assignmentsByStatus()[col.key].length }}
                </span>
              </div>

              <!-- Column Cards -->
              <div class="cards-list">
                @for (item of assignmentsByStatus()[col.key]; track item.id) {
                  <div
                    class="chore-card"
                    tabindex="0"
                    role="button"
                    (click)="selectAssignment(item)"
                    (keydown.enter)="selectAssignment(item)"
                  >
                    <!-- Top: Title & Points -->
                    <div class="card-top">
                      <span class="card-title">{{ item.chore_title }}</span>
                      <span class="points-badge">{{ item.chore_points }} pts</span>
                    </div>

                    <!-- Bottom: Child avatar & Due date -->
                    <div class="card-bottom">
                      <div class="child-info">
                        <div class="child-avatar" [title]="item.assigned_to_name">
                          {{ getInitials(item.assigned_to_name) }}
                        </div>
                        <span class="child-name">{{ item.assigned_to_name }}</span>
                      </div>
                      <span class="due-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="due-icon">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ formatDueDate(item.due_date) }}
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-column">
                    <p>No chores here</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Assignment Detail Modal -->
      @if (selectedAssignment(); as assignment) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-header-text">
                <span class="modal-badge">{{ getStatusLabel(assignment.status) }}</span>
                <h2 id="modal-title" class="modal-title">{{ assignment.chore_title }}</h2>
              </div>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close dialog"
                (click)="closeModal()"
              >
                ✕
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <div class="meta-row">
                <div class="meta-item">
                  <span class="meta-label">Assigned To</span>
                  <div class="meta-child">
                    <div class="child-avatar sm">
                      {{ getInitials(assignment.assigned_to_name) }}
                    </div>
                    <span class="meta-value">{{ assignment.assigned_to_name }}</span>
                  </div>
                </div>

                <div class="meta-item">
                  <span class="meta-label">Reward Points</span>
                  <span class="points-pill">{{ assignment.chore_points }} Points</span>
                </div>

                <div class="meta-item">
                  <span class="meta-label">Due Date</span>
                  <span class="meta-value">{{ formatDueDate(assignment.due_date) }}</span>
                </div>
              </div>

              <!-- Description -->
              <div class="description-section">
                <span class="meta-label">Description</span>
                <p class="description-text">
                  {{ assignment.chore_description || assignment.description || 'No description provided for this chore.' }}
                </p>
              </div>
            </div>

            <!-- Modal Footer / Actions -->
            <div class="modal-footer">
              <div class="modal-footer-left">
                @if (currentHouseholdRole() === 'parent') {
                  <button
                    type="button"
                    class="btn-edit"
                    (click)="onEditChore(assignment)"
                  >
                    Edit
                  </button>
                }
              </div>

              <div class="modal-footer-right">
                @if (assignment.status === 'submitted') {
                  <div class="approval-actions">
                    <button
                      type="button"
                      class="btn-reject"
                      (click)="onReject(assignment)"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      class="btn-approve"
                      (click)="onApprove(assignment)"
                    >
                      Approve
                    </button>
                  </div>
                } @else {
                  <button
                    type="button"
                    class="btn-secondary"
                    (click)="closeModal()"
                  >
                    Close
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Chore Create / Edit Modal Form -->
      @if (showCreateForm()) {
        <app-chore-form
          [chore]="editingChore()"
          (saved)="onFormSaved()"
          (cancelled)="onFormCancelled()"
        ></app-chore-form>
      }
    </div>
  `,
  styles: [`
    .board-page {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 80px);
      background-color: #F9FAFB;
      font-family: inherit;
    }

    /* Header */
    .board-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      background-color: #0F766E;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 150ms ease, transform 100ms ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-primary:hover {
      background-color: #0D655E;
    }

    .btn-primary:active {
      transform: translateY(1px);
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 9px 16px;
      background-color: #FFFFFF;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: all 150ms ease;
    }

    .btn-secondary:hover {
      background-color: #F3F4F6;
      border-color: #9CA3AF;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 96px 16px;
      color: #6B7280;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E5E7EB;
      border-top-color: #0F766E;
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error Card */
    .error-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      margin: 40px auto;
    }

    .error-icon {
      font-size: 28px;
      line-height: 1;
    }

    .error-content h3 {
      font-size: 17px;
      font-weight: 600;
      color: #991B1B;
      margin: 0 0 6px 0;
    }

    .error-content p {
      font-size: 14px;
      color: #7F1D1D;
      margin: 0 0 16px 0;
    }

    .error-actions {
      display: flex;
      gap: 12px;
    }

    /* Kanban Grid */
    .kanban-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      align-items: flex-start;
    }

    .kanban-column {
      background-color: #F3F4F6;
      border-radius: 12px;
      padding: 16px;
      min-height: 600px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 4px;
    }

    .column-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .column-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .column-count {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      line-height: 1.4;
    }

    .cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    /* Chore Card */
    .chore-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
      cursor: pointer;
      transition: all 150ms ease;
      display: flex;
      flex-direction: column;
      gap: 14px;
      outline: none;
    }

    .chore-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border-color: #D1D5DB;
      transform: translateY(-1px);
    }

    .chore-card:focus-visible {
      border-color: #0F766E;
      box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.2);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      line-height: 1.35;
      word-break: break-word;
    }

    .points-badge {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid #F3F4F6;
    }

    .child-info {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .child-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #CCFBF1;
      color: #0F766E;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .child-avatar.sm {
      width: 24px;
      height: 24px;
      font-size: 11px;
    }

    .child-name {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .due-date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6B7280;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .due-icon {
      width: 14px;
      height: 14px;
    }

    .empty-column {
      background-color: rgba(255, 255, 255, 0.6);
      border: 1px dashed #D1D5DB;
      border-radius: 8px;
      padding: 32px 16px;
      text-align: center;
      color: #9CA3AF;
      font-size: 13px;
      font-weight: 500;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(17, 24, 39, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1000;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Modal Card */
    .modal-card {
      background-color: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      animation: scaleUp 150ms ease;
    }

    @keyframes scaleUp {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 24px 24px 16px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .modal-header-text {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .modal-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: 9999px;
      background-color: #F3F4F6;
      color: #4B5563;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .modal-close-btn:hover {
      color: #111827;
      background-color: #F3F4F6;
    }

    .modal-body {
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .meta-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 14px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }

    .meta-child {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .points-pill {
      color: #B45309;
      font-weight: 700;
      font-size: 14px;
    }

    .description-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .description-text {
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      margin: 0;
      background-color: #F9FAFB;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .modal-footer {
      padding: 16px 24px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid #F3F4F6;
    }

    .modal-footer-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-footer-right {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
    }

    .btn-edit {
      padding: 9px 16px;
      background-color: #FFFFFF;
      color: #0F766E;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid #0F766E;
      border-radius: 8px;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-edit:hover {
      background-color: #F0FDFA;
    }

    .approval-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      justify-content: flex-end;
    }

    .btn-approve {
      padding: 9px 18px;
      background-color: #10B981;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-approve:hover {
      background-color: #059669;
    }

    .btn-reject {
      padding: 9px 18px;
      background-color: #EF4444;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-reject:hover {
      background-color: #DC2626;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .kanban-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .board-page {
        padding: 20px 16px;
      }

      .board-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .kanban-grid {
        grid-template-columns: 1fr;
      }

      .meta-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `]
})
export class ChoreBoardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly assignments = signal<Assignment[]>([]);
  readonly selectedAssignment = signal<Assignment | null>(null);
  readonly showCreateForm = signal(false);
  readonly editingChore = signal<Chore | null>(null);

  readonly currentHouseholdRole = this.authService.currentHouseholdRole;

  readonly columns: BoardColumn[] = [
    { key: 'pending', title: 'Not Started', color: '#6B7280', badgeBg: '#E5E7EB' },
    { key: 'in_progress', title: 'In Progress', color: '#F59E0B', badgeBg: '#FEF3C7' },
    { key: 'submitted', title: 'Submitted', color: '#3B82F6', badgeBg: '#DBEAFE' },
    { key: 'approved', title: 'Approved', color: '#10B981', badgeBg: '#D1FAE5' },
  ];

  readonly assignmentsByStatus = computed(() => {
    const all = this.assignments();
    return {
      pending: all.filter((a) => a.status === 'pending' || a.status === 'overdue' || a.status === 'rejected'),
      in_progress: all.filter((a) => a.status === 'in_progress'),
      submitted: all.filter((a) => a.status === 'submitted'),
      approved: all.filter((a) => a.status === 'approved'),
    };
  });

  ngOnInit(): void {
    this.loadBoardData();
  }

  loadBoardData(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.assignmentService.listByHousehold(householdId).subscribe({
      next: (data) => {
        this.assignments.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load chore board. Please try again.');
      },
    });
  }

  selectAssignment(assignment: Assignment): void {
    this.selectedAssignment.set(assignment);
  }

  closeModal(): void {
    this.selectedAssignment.set(null);
  }

  onNewChore(): void {
    this.editingChore.set(null);
    this.showCreateForm.set(true);
  }

  onEditChore(assignment: Assignment): void {
    const choreObj: Chore = (assignment as any).chore || {
      id: assignment.chore_id,
      household_id: assignment.household_id,
      title: assignment.chore_title,
      description: assignment.chore_description || assignment.description || null,
      points: assignment.chore_points,
      category: null,
      recurrence: 'none',
      recurrence_days: null,
      is_active: true,
      created_by: assignment.assigned_by,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
    };
    this.editingChore.set(choreObj);
    this.selectedAssignment.set(null);
    this.showCreateForm.set(true);
  }

  onFormSaved(): void {
    this.showCreateForm.set(false);
    this.editingChore.set(null);
    this.loadBoardData();
  }

  onFormCancelled(): void {
    this.showCreateForm.set(false);
    this.editingChore.set(null);
  }

  onApprove(assignment: Assignment): void {
    console.log('Approve chore assignment', assignment.id);
  }

  onReject(assignment: Assignment): void {
    console.log('Reject chore assignment', assignment.id);
  }

  getInitials(name?: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatDueDate(dateStr?: string): string {
    if (!dateStr) return 'No due date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
      case 'overdue':
      case 'rejected':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Approved';
      default:
        return status;
    }
  }
}
