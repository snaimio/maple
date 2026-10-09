/**
 * User account representing a parent or child.
 */
export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
}

/**
 * Household family unit.
 */
export interface Household {
  id: number;
  name: string;
  invite_code?: string;
  role?: 'parent' | 'child' | 'admin';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Household member with role and calculated points balance.
 */
export interface HouseholdMember {
  id: number;
  household_id?: number;
  user_id: number;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role_in_household: 'parent' | 'child' | 'admin';
  points_balance: number;
  joined_at: string;
}

/**
 * Chore definition created by parents.
 */
export interface Chore {
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  points: number;
  category: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'custom';
  recurrence_days: string | null;
  is_active: boolean;
  created_by: number;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Assignment of a chore to a child with a due date.
 */
export interface Assignment {
  id: number;
  chore_id: number;
  chore_title: string;
  chore_points: number;
  household_id: number;
  assigned_to: number;
  assigned_to_name: string;
  assigned_by: number;
  assigned_by_name: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  created_at: string;
  updated_at: string;
}

/**
 * Submission by a child indicating a chore has been completed.
 */
export interface Completion {
  id: number;
  assignment_id: number;
  submitted_by?: number;
  evidence_url?: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number | null;
  rejection_note?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
}

/**
 * Reward catalog item redeemable using points.
 */
export interface Reward {
  id: number;
  household_id: number;
  title: string;
  description: string | null;
  cost_points: number;
  is_active: boolean;
  created_by: number;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Redemption request made by a child for a reward.
 */
export interface Redemption {
  id: number;
  reward_id: number;
  reward_title?: string;
  redeemed_by?: number;
  points_spent: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  reviewed_by?: number | null;
  rejection_note?: string | null;
  requested_at?: string;
  resolved_at?: string | null;
}

/**
 * Append-only ledger record tracking every points balance change.
 */
export interface PointsTransaction {
  id: number;
  user_id: number;
  household_id: number;
  delta: number;
  reason: 'chore_reward' | 'reward_redemption' | 'manual_adjustment' | 'bonus';
  reference_type: 'chore_completion' | 'reward_redemption' | 'manual';
  reference_id: number | null;
  note: string | null;
  created_at: string;
}

/**
 * Leaderboard entry representing a child's ranking and points.
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  points_balance: number;
  weekly_points: number;
  medal: '🥇' | '🥈' | '🥉' | null;
}
