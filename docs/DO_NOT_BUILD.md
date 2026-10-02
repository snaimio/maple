# DO NOT BUILD (Until Capstone Is Submitted)

This file exists because the #1 threat to this project is no longer
architecture. It is **scope creep**.

Every time you get excited about a new idea, read this file first.

---

## Not for MVP

### AI / ML
- AI meal planner
- AI family assistant
- AI chore suggestions
- LLM integration of any kind
- Prompt engineering

### Notifications (table exists; feature does not ship)
The `notifications` table was created by migration 010 so Module 4 can
activate it later without a schema change. No code writes to it in
Module 1.

- Generating notification rows
- Read/unread state management
- Badge counts
- Notification preferences
- Email delivery
- Push delivery

### Platforms
- iOS app
- Android app
- PWA
- WidgetKit / Home Screen widgets
- Siri integration
- Google Assistant integration

### Infrastructure
- Firebase
- Cloud Firestore
- CloudKit
- Real-time updates
- WebSockets
- Server-Sent Events
- JWT authentication
- Payment systems (Stripe, etc.)
- SMTP / email sending

### Features Deferred to Modules 2–6
- Grocery / shopping lists
- Shared family calendar
- Reminders module
- Meal planning module
- "Who picked up the kids?" check-in
- Emergency contacts
- School item tracker

### Complex Chore Logic
- Monthly recurrence
- Custom day-of-week rules
- Skip-a-day logic
- Edited-chore propagation across future assignments
- Duplicate-generation prevention
- Full scheduler engine

### Middleware
Controllers use private `assertMember()` / `assertParent()` methods for
authorization. A shared `RequireAuth` / `RequireRole` middleware layer is
a post-capstone refactor, not MVP scope.

### UI Enhancement (Until Core Is Polished)
- Dark mode (until Day 71)
- Animation library
- Custom illustrations
- Onboarding tour
- Confetti / gamification effects

---

## The Rule

> **If it isn't in `SCOPE.md`'s MVP list, it doesn't get built until every
> MVP item is done and polished.**

Everything else — Nice-to-Have, Stretch, and Roadmap — waits.

---

## How to Use This File

1. Bookmark it in VS Code.
2. Pin it in your editor.
3. Reference it in `AIReflection.md` when you catch yourself drifting.
4. When the MVP ships and you still have days left, you may revisit
   *one* item from this list — and only one.

---

*Last updated: October 2026*