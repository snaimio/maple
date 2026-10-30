import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChoreService } from '../../core/services/chore.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { HouseholdService } from '../../core/services/household.service';
import { ApiService } from '../../core/services/api.service';
import { Chore, Assignment, HouseholdMember } from '../../core/models';

/**
 * Modal form component for creating and editing household chores.
 *
 * Supports assigning chores to children and setting due dates in create mode,
 * or updating title, description, points, and category in edit mode.
 */
@Component({
  selector: 'app-chore-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-backdrop" (click)="onCancel()">
      <div
        class="form-card"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="chore ? 'edit-chore-title' : 'create-chore-title'"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="form-header">
          <h2 id="chore-form-title" class="form-title">
            {{ chore ? 'Edit Chore' : 'Create Chore' }}
          </h2>
          <button
            type="button"
            class="close-btn"
            aria-label="Close dialog"
            (click)="onCancel()"
          >
            ✕
          </button>
        </div>

        <!-- Form Body -->
        <form (ngSubmit)="onSubmit()" class="form-body">
          @if (error(); as errMessage) {
            <div class="error-banner">
              <span class="error-icon">⚠️</span>
              <span>{{ errMessage }}</span>
            </div>
          }

          <!-- Title Field -->
          <div class="form-group">
            <label for="title" class="form-label">
              Title <span class="required">*</span>
            </label>
            <input
              id="title"
              type="text"
              class="form-input"
              placeholder="e.g., Wash dinner dishes"
              [value]="title()"
              (input)="title.set($any($event.target).value)"
              required
            />
          </div>

          <!-- Description Field -->
          <div class="form-group">
            <label for="description" class="form-label">Description</label>
            <textarea
              id="description"
              class="form-textarea"
              placeholder="Optional notes or instructions..."
              rows="3"
              [value]="description()"
              (input)="description.set($any($event.target).value)"
            ></textarea>
          </div>

          <!-- Points and Category Row -->
          <div class="form-row">
            <!-- Points Field -->
            <div class="form-group">
              <label for="points" class="form-label">
                Points <span class="required">*</span>
              </label>
              <input
                id="points"
                type="number"
                min="1"
                max="1000"
                class="form-input"
                [value]="points()"
                (input)="points.set(+$any($event.target).value)"
                required
              />
            </div>

            <!-- Category Field -->
            <div class="form-group">
              <label for="category" class="form-label">Category</label>
              <select
                id="category"
                class="form-select"
                [value]="category()"
                (change)="category.set($any($event.target).value)"
              >
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Assignment Fields -->
          <div class="form-row">
            <!-- Assigned To Field -->
            <div class="form-group">
              <label for="assignee" class="form-label">Assigned To</label>
              <select
                id="assignee"
                class="form-select"
                [value]="assigneeId() ?? ''"
                (change)="onAssigneeChange($any($event.target).value)"
              >
                <option value="">Unassigned</option>
                @for (child of children(); track child.user_id) {
                  <option [value]="child.user_id">{{ child.display_name }}</option>
                }
              </select>
            </div>

            <!-- Due Date Field -->
            <div class="form-group">
              <label for="dueDate" class="form-label">Due Date</label>
              <input
                id="dueDate"
                type="date"
                class="form-input"
                [value]="dueDate()"
                (input)="dueDate.set($any($event.target).value)"
              />
            </div>
          </div>

          <!-- Form Footer Actions -->
          <div class="form-footer">
            <button
              type="button"
              class="btn-cancel"
              [disabled]="loading()"
              (click)="onCancel()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-save"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="btn-spinner"></span>
                <span>Saving...</span>
              } @else {
                <span>Save</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-backdrop {
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
      z-index: 1100;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .form-card {
      background-color: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      animation: scaleUp 150ms ease;
      font-family: inherit;
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

    .form-header {
      padding: 24px 24px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F3F4F6;
    }

    .form-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 18px;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .close-btn:hover {
      color: #111827;
      background-color: #F3F4F6;
    }

    .form-body {
      padding: 20px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .required {
      color: #EF4444;
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #111827;
      background-color: #FFFFFF;
      transition: border-color 150ms ease, box-shadow 150ms ease;
      font-family: inherit;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      outline: none;
      border-color: #0F766E;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
    }

    .form-textarea {
      resize: vertical;
      min-height: 72px;
    }

    .form-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #F3F4F6;
      margin-top: 4px;
    }

    .btn-cancel {
      padding: 10px 18px;
      background-color: #FFFFFF;
      color: #374151;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-cancel:hover:not(:disabled) {
      background-color: #F3F4F6;
      border-color: #9CA3AF;
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 22px;
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease, transform 100ms ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      min-width: 80px;
    }

    .btn-save:hover:not(:disabled) {
      background-color: #0D655E;
    }

    .btn-save:active:not(:disabled) {
      transform: translateY(1px);
    }

    .btn-save:disabled,
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-card {
        width: 95%;
        max-width: 480px;
      }

      .form-row {
        gap: 12px;
      }
    }

    @media (max-width: 480px) {
      .form-card {
        width: 95%;
        max-width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        border-radius: 12px;
      }

      .form-header {
        padding: 16px 18px 12px;
      }

      .form-title {
        font-size: 18px;
      }

      .close-btn {
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .form-body {
        padding: 16px 18px 20px;
        gap: 14px;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .form-input,
      .form-textarea,
      .form-select {
        min-height: 44px;
        font-size: 16px;
      }

      .form-actions {
        flex-direction: column-reverse;
        gap: 10px;
      }

      .btn-save,
      .btn-cancel {
        width: 100%;
        min-height: 44px;
      }
    }
  `],
})
export class ChoreFormComponent implements OnInit {
  @Input() chore: Chore | null = null;
  @Input() assignment: Assignment | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly choreService = inject(ChoreService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly householdService = inject(HouseholdService);
  private readonly apiService = inject(ApiService);

  readonly title = signal('');
  readonly description = signal('');
  readonly points = signal<number>(10);
  readonly category = signal<string>('Kitchen');
  readonly assigneeId = signal<number | null>(null);
  readonly dueDate = signal<string>('');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly children = signal<HouseholdMember[]>([]);

  readonly categories = ['Kitchen', 'Living Room', 'Laundry', 'Pets', 'Yard', 'Other'];

  ngOnInit(): void {
    if (this.chore) {
      this.title.set(this.chore.title || '');
      this.description.set(this.chore.description || '');
      this.points.set(this.chore.points || 10);
      this.category.set(this.chore.category || 'Kitchen');
    }

    if (this.assignment) {
      if (this.assignment.assigned_to && this.assignment.assigned_to > 0) {
        this.assigneeId.set(this.assignment.assigned_to);
      }
      if (this.assignment.due_date) {
        this.dueDate.set(this.assignment.due_date);
      }
    }

    const householdId = this.authService.currentHouseholdId();
    if (householdId) {
      this.householdService.getMembers(householdId).subscribe({
        next: (members) => {
          const childMembers = (members || []).filter(
            (m) => m.role_in_household === 'child' || (m as any).role === 'child'
          );
          this.children.set(childMembers);
        },
        error: () => {
          this.children.set([]);
        },
      });
    }
  }

  onAssigneeChange(value: string): void {
    this.assigneeId.set(value === '' ? null : Number(value));
  }

  onCancel(): void {
    if (this.loading()) return;
    this.cancelled.emit();
  }

  onSubmit(): void {
    const t = this.title().trim();
    if (!t) {
      this.error.set('Title is required.');
      return;
    }

    const pts = Number(this.points());
    if (isNaN(pts) || pts < 1) {
      this.error.set('Points must be at least 1.');
      return;
    }

    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.error.set('No household found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    if (this.chore) {
      // Edit mode: update existing chore
      this.choreService.update(this.chore.id, {
        title: t,
        description: this.description().trim() || null,
        points: pts,
        category: this.category() || null,
      }).subscribe({
        next: () => {
          const assignee = this.assigneeId();
          if (assignee !== null) {
            const dueDateVal = this.dueDate() || new Date().toISOString().split('T')[0];
            this.assignmentService.assign(this.chore!.id, [assignee], dueDateVal).subscribe({
              next: () => {
                this.loading.set(false);
                this.saved.emit();
              },
              error: () => {
                this.loading.set(false);
                this.saved.emit();
              },
            });
          } else {
            this.loading.set(false);
            this.saved.emit();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.error || 'Failed to update chore. Please try again.');
        },
      });
    } else {
      // Create mode: create chore, then assign if assigneeId is set
      this.choreService.create(householdId, {
        title: t,
        description: this.description().trim() || null,
        points: pts,
        category: this.category() || null,
      }).subscribe({
        next: (newChore) => {
          const assignee = this.assigneeId();
          if (assignee !== null) {
            const dueDateVal = this.dueDate() || new Date().toISOString().split('T')[0];
            this.assignmentService.assign(newChore.id, [assignee], dueDateVal).subscribe({
              next: () => {
                this.loading.set(false);
                this.saved.emit();
              },
              error: () => {
                this.loading.set(false);
                this.saved.emit();
              },
            });
          } else {
            this.loading.set(false);
            this.saved.emit();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.error || 'Failed to create chore. Please try again.');
        },
      });
    }
  }
}
