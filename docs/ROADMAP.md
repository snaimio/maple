# Maple — Product Roadmap

Maple is envisioned as a family operating system — a single place for the
fragmented tools families juggle today. It ships in modules. Each module is
self-contained but shares the same household membership model, the same
authentication layer, and the same REST API conventions.

---

## Module 1 — Household Responsibility ✅

**Status:** Shipped in this capstone.

**What it does:** Family chore management, points ledger, rewards catalog,
leaderboard, and analytics.

**Core features:**
- User accounts (parent / child / admin roles per household)
- Household creation and invite-code joining
- Chore CRUD with soft delete
- Assignment of chores to children with due dates
- Completion submission and parent approval/rejection
- Append-only points ledger (`SUM(delta)` for balances)
- Reward catalog with redemption approval workflow
- Household leaderboard with medals and weekly deltas
- Analytics dashboard (weekly activity, chore stats, member stats)

**Tech:** PHP 8 (framework-free REST API), MySQL, Angular (frontend).

---

## Module 2 — Shared Family Calendar

**Status:** Planned.

**What it does:** A shared calendar for the household — events, appointments,
school pickups, activities, and shared reminders.

**Planned features:**
- Event CRUD with start/end times and locations
- Recurring events (weekly, monthly, custom)
- Attendee RSVPs
- Month / week / day views
- Optional: reminders tied into Module 4

**Why after Module 1:** The household membership model is already in place.
A calendar just adds a new resource that hangs off the same household.

---

## Module 3 — Grocery & Shopping Lists

**Status:** Planned.

**What it does:** Shared shopping lists that sync between family members.

**Planned features:**
- Multiple lists per household (Weekly Shop, Costco, Party Supplies)
- Item CRUD with quantity and category
- Mark items as "in cart" / "purchased"
- Optional: real-time updates via polling or WebSockets
- Optional: integration with Module 5 meal planning

**Why after Module 1:** Same pattern as chores — a household-owned resource
with a status lifecycle.

---

## Module 4 — Reminders & Notifications

**Status:** Planned.

**What it does:** A reminders and notification layer that any other module can
plug into. Scheduled reminders, in-app notifications, and delivery tracking.

**Planned features:**
- Reminder CRUD (title, due date, repeat rule, audience)
- In-app notification feed
- Email notifications
- Push notifications (browser or mobile)
- Notification preferences per user

**Why after Module 1:** The `notifications` table is already migrated but
unused. Module 4 activates it and gives every other module a delivery channel.

---

## Module 5 — Meal Planning

**Status:** Planned.

**What it does:** Weekly meal planning that connects recipes, ingredients, and
shopping lists.

**Planned features:**
- Recipe CRUD with ingredients and steps
- Weekly meal plan grid (breakfast / lunch / dinner × 7 days)
- Auto-generated shopping list from the week's plan (feeds Module 3)
- Optional: dietary preferences and restrictions

**Why after Module 1:** Depends on Modules 3 and 4 for the shopping list
integration and the notification layer.

---

## Module 6 — AI Family Assistant

**Status:** Planned.

**What it does:** A conversational helper that can suggest meals, reschedule
chores, detect calendar conflicts, and answer household questions.

**Planned features:**
- Chat interface with the assistant
- Prompt-based actions (e.g. "plan meals for the week")
- Read access to Modules 1–5 data
- Write access guarded by explicit confirmation

**Why last:** Modules 1–5 generate the structured data an assistant can reason
over. Building the AI layer first would mean guessing at the schema.

---

## Cross-Module — Platform & Integrations

**Status:** Planned long-term.

- iOS app (Swift / SwiftUI)
- Android app (Kotlin)
- Home Screen widgets
- Siri / Google Assistant integration
- Offline-first sync

---

## Guiding Principles

1. **Ship one module at a time.** A polished module teaches more than five
   half-finished ones.
2. **Reuse the household model.** Every module hangs off `households` and
   `household_members`.
3. **Same API conventions.** Every module follows
   [`API_CONTRACT.md`](API_CONTRACT.md).
4. **Keep scope honest.** If a feature isn't on this list, it doesn't get
   built. See [`DO_NOT_BUILD.md`](DO_NOT_BUILD.md).

---

*Last updated: October 2026*