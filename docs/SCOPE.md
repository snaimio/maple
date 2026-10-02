# Maple — Module 1 Scope

This document defines exactly what is being built in the capstone, what is
nice-to-have, and what is explicitly out of scope. If a feature is not listed
as **MVP**, it does not get built until every MVP item is done and polished.

---

## MVP — Required for Capstone

Everything listed here ships. No exceptions.

### Authentication & Authorization
- [x] Register with email and password
- [x] Login / logout
- [x] Password hashing with `password_hash()` / `password_verify()`
- [x] Session-based authentication
- [x] Session regeneration on login (prevents session fixation)
- [x] Role checks per household (`parent`, `child`, `admin`)
- [x] Household membership check on every protected route

### Households
- [x] Create a household
- [x] Join via invite code
- [x] List household members with their roles and points balance
- [x] Deterministic member ordering (parents first, then children)

### Chores
- [x] Chore CRUD (create, read, update)
- [x] Soft delete (`is_active = 0`)
- [x] Point value per chore
- [x] Category field
- [x] Parent-only creation and modification

### Assignments
- [x] Assign a chore to one or more children
- [x] Set due date
- [x] List assignments with filters (`user_id`, `status`)
- [x] Restrict assignments to children in the same household

### Completions
- [x] Child submits completion with optional note
- [x] Only the assigned child can submit
- [x] Parent approves or rejects with a rejection note
- [x] Atomic transaction on approval (status flip + ledger insert)
- [x] `WHERE status = 'pending'` guard on approve/reject

### Points Ledger
- [x] Append-only `points_transactions` table
- [x] Balance computed as `SUM(delta)` — never stored
- [x] Every point change has a reason and reference
- [x] `PointsService::award()` is the only write path

### Rewards
- [x] Reward CRUD (create, read, update)
- [x] Soft delete (`is_active = 0`)
- [x] Cost in points per reward
- [x] Parent-only management

### Redemptions
- [x] Child redeems a reward
- [x] Balance check at request time
- [x] Balance re-check at approval time
- [x] Parent approves or rejects with a rejection note
- [x] Atomic transaction on approval (status flip + negative ledger insert)
- [x] `WHERE status = 'pending'` guard

### Leaderboard & Analytics
- [x] Leaderboard ranked by points balance
- [x] Weekly points delta per child
- [x] Medal for top 3
- [x] Analytics: weekly activity
- [x] Analytics: chore completion counts
- [x] Analytics: member stats

### Polish
- [ ] Empty states on every list view
- [ ] Loading states on every async request
- [ ] Error states with retry on every API failure
- [ ] Responsive design (mobile + desktop)
- [ ] Tested end-to-end flow:
      register → create household → invite → assign chore → complete
      → approve → points update → redeem reward → leaderboard updates

---

## Nice-to-Have — Only If MVP Is Complete

Build these only after every MVP item above is polished.

- Streaks — "5 days in a row" badges for children
- Dark mode — a CSS theme toggle
- Profile avatars — image upload and display
- In-app notification feed — using the existing `notifications` table

---

## Stretch — Only If Far Ahead

Build these only after both MVP and Nice-to-Have are complete.

- Weekly recurring chores — every Tuesday only (no custom day-of-week rules)
- Evidence photo upload on completion submissions
- React re-implementation of the Analytics module (framework comparison)

---

## Out of Scope — Not Being Built

These were considered and explicitly excluded. See
[`DO_NOT_BUILD.md`](DO_NOT_BUILD.md) for the full reasoning.

### Functionality Deferred to Modules 2–6
- Shared family calendar
- Grocery / shopping lists
- Reminders module
- Meal planning
- AI family assistant
- "Who picked up the kids?" check-in
- Emergency contacts
- School item tracker

### Infrastructure Not In Scope
- JWT authentication (sessions are sufficient)
- Firebase / Firestore / CloudKit
- WebSockets / Server-Sent Events
- Payment processing
- Email delivery (SMTP)
- Push notifications
- iOS / Android apps
- PWA / offline support

### UI and Polish Not In Scope
- Custom illustrations
- Animation library
- Onboarding tour
- Confetti / gamification effects

### Complex Chore Logic Not In Scope
- Monthly recurrence
- Custom day-of-week rules
- Skip-a-day logic
- Edited-chore propagation across future assignments
- Duplicate-generation prevention
- Full scheduler engine

---

## The Rule

> **If it isn't in the MVP list above, it doesn't get built until every MVP
> item is done and polished.**

Everything else — Nice-to-Have, Stretch, and Roadmap — waits.

---

*Last updated: October 2026*