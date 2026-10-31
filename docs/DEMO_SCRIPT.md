# 🍁 Maple — Professional Product Walkthrough & Demo Script

**Project:** Maple — Family Chore & Reward Management System  
**Developer:** Sheikh Naim  
**Video Target Duration:** 4:00 – 4:30 minutes  
**Format:** High-Definition Screen Recording with Professional Voiceover  
**Recommended Tools:** OBS Studio, QuickTime Player (1080p / 60fps), or Loom  

---

## 🎬 Pre-Recording Checklist & Environment Setup

1. **Start Backend REST API**:
   ```bash
   cd maple
   php -S localhost:8000 -t public
   ```
2. **Start Angular Application**:
   ```bash
   cd frontend && npm start
   ```
3. **Seed Database to Clean Demo State**:
   ```bash
   php seeders/demo_family.php
   ```
4. **Display & Browser Configuration**:
   - Resolution: 1920x1080 (1080p) or 2560x1440 scaled
   - Browser: Google Chrome in clean profile / incognito
   - URL: `http://localhost:4200/login`
   - Default Zoom: 100% (`Cmd + 0`)
   - Bookmark bar & extensions hidden (`Cmd + Shift + B`)

---

## ⏱️ Shot-by-Shot Walkthrough Script

### Scene 1: Platform Vision & Architecture (0:00 – 0:25)

* **Visual:** Browser opened to the Maple login page (`/login`). Smooth cursor hover over the split-screen design, highlighting the brand logo, teal palette (`#0F766E`), and responsive layout.
* **On-Screen Card:** `Maple — Full-Stack Family Productivity & Gamified Reward Engine`
* **Voiceover:**
  > "Hello, I'm Sheikh Naim. Welcome to Maple—a modern, full-stack family coordination and chore gamification platform. In most busy households, accountability gets lost in sticky notes, group chats, and verbal reminders. Maple transforms family accountability into an engaging, transparent workflow built on Angular 17, PHP 8.4 REST services, and an immutable, financial-grade points ledger. Let's explore how it works."

---

### Scene 2: Role-Based Authentication & Session Security (0:25 – 0:50)

* **Visual:**
  1. Click email input, type `alex@maple.test`.
  2. Type `password123`.
  3. Click **Log In**.
  4. Smooth page transition without page flicker as Angular signals hydrate the Parent Dashboard.
* **On-Screen Card:** `Role-Based Authentication · Secure Session Handshake · Bcrypt`
* **Voiceover:**
  > "We'll begin by logging in as Alex, the household parent. Maple implements secure, session-based authentication with strict role-based access control. The authentication layer isolates parent administrative tools from child activities while maintaining continuous state across the single-page application using Angular Signals."

---

### Scene 3: Parent Command Center & Real-Time Household Metrics (0:50 – 1:20)

* **Visual:** Smooth scroll down the Parent Dashboard.
  1. Hover over the KPI summary cards (Completed Chores, Points Awarded, Active Family Streak).
  2. Highlight the **Pending Approvals** quick-action banner.
  3. Showcase the **Today's Chores** summary and embedded **Weekly Points Activity** chart.
* **On-Screen Card:** `Executive Dashboard · Live Aggregations · Chart.js Analytics`
* **Voiceover:**
  > "Here is the Parent Command Center. At a glance, parents get instant visibility into household productivity: key performance indicators tracking completed tasks, total points in circulation, and current family consistency streaks. Below, an approvals widget flags pending submissions, while an integrated Chart.js chart visualizes daily contribution momentum."

---

### Scene 4: Interactive Kanban Board & Task State Machine (1:20 – 1:55)

* **Visual:**
  1. Click **Chores** in the navigation header.
  2. Pan across the 4-column Kanban board: `Not Started`, `In Progress`, `Submitted`, `Approved`.
  3. Click on a chore card (e.g., "Empty Dishwasher") to open the slide-out detail modal.
  4. Inspect the point values, category badges, and assigned child.
  5. Close modal.
* **On-Screen Card:** `4-Stage Kanban Workflow · Categorization · Point Weighting`
* **Voiceover:**
  > "Navigating to the Chore Board, we see a complete 4-stage Kanban workflow: Not Started, In Progress, Submitted, and Approved. Each chore card features point weightings, category badges, and child assignment tags. Clicking any card opens a detailed view allowing parents to adjust schedules or reassign tasks on demand."

---

### Scene 5: Task Provisioning & Granular Assignment (1:55 – 2:20)

* **Visual:**
  1. Click **+ New Chore** button.
  2. Enter Title: `"Clean Garage & Organize Tools"`.
  3. Enter Points: `25`.
  4. Select Category: `Yard & Maintenance`.
  5. Select Assignee: `Jamie`.
  6. Set Due Date: Tomorrow.
  7. Click **Create Chore**.
  8. Show the newly created card immediately render in the `Not Started` column with toast confirmation.
* **On-Screen Card:** `Instant Chore Creation · Reactive State Sync · Toast Feedback`
* **Voiceover:**
  > "Creating a chore is effortless. Parents assign a title, point value, and category, then assign it to a specific family member with a strict deadline. The task instantly populates the Kanban board through Angular's reactive state management—zero page reload required."

---

### Scene 6: Child Experience & Task Completion Workflow (2:20 – 2:55)

* **Visual:**
  1. Click the top-right profile avatar ➔ **Log Out**.
  2. Log in as child: `jamie@maple.test` / `password123`.
  3. Show Jamie's personalized Child Dashboard: current balance (120 pts), active chores, and reward progress ring.
  4. Locate "Clean Garage" or assigned chore.
  5. Click **Mark Complete**.
  6. Type note: `"Swept the floor and organized toolboxes!"`.
  7. Click **Submit for Approval**. Card status shifts to `Submitted`.
* **On-Screen Card:** `Personalized Child Portal · Completion Evidence · Gamification`
* **Voiceover:**
  > "Now, let's switch personas to Jamie, a child in the household. Notice how the interface dynamically adapts: Jamie sees his personal point balance, assigned tasks, and savings goals. When Jamie completes his chore, he submits it with a completion note, immediately shifting the chore into the parent's verification queue."

---

### Scene 7: Verification Gate & Double-Entry Points Ledger (2:55 – 3:30)

* **Visual:**
  1. Log out, log back in as `alex@maple.test`.
  2. Navigate to **Approvals Queue** (`/completions`).
  3. View Jamie's submission with his timestamped note.
  4. Click **Approve**.
  5. Show the approval card animate away and display success toast.
* **On-Screen Card:** `Two-Sided Verification · Atomic DB Transactions · Immutable Points Ledger`
* **Voiceover:**
  > "Back on the parent account, the Approvals Queue provides a quality control gate. Parents review the child's note before awarding points. When the parent clicks Approve, the backend executes an atomic MySQL transaction: updating the completion status and inserting an immutable credit record into our points transaction ledger. Balances are computed mathematically from transaction history, preventing race conditions or tampering."

---

### Scene 8: Gamified Rewards Store & Double-Spend Protection (3:30 – 4:05)

* **Visual:**
  1. Navigate to **Rewards** (`/rewards`).
  2. Briefly show the parent's reward management tools (CRUD catalog).
  3. Switch to Jamie's account (`jamie@maple.test`).
  4. Open **Rewards Store**.
  5. Hover over reward cards with point costs and affordability badges.
  6. Click **Redeem** on `"Pick the Family Movie"` (75 pts).
  7. Confirm redemption modal. Point balance updates immediately.
* **On-Screen Card:** `Milestone Redemptions · Real-Time Balance Validation · Anti-Double Spend`
* **Voiceover:**
  > "Points earned translate into real-world incentives. In the Rewards Store, children redeem accumulated points for parent-curated privileges, such as movie nights or weekend outings. Built-in balance checks guarantee children cannot redeem rewards beyond their current balance, maintaining complete financial integrity."

---

### Scene 9: Family Leaderboard & Chart.js Visual Intelligence (4:05 – 4:35)

* **Visual:**
  1. Click **Leaderboard** (`/leaderboard`). Hover over the top podium ranks (Gold, Silver, Bronze) and highlight the "YOU" badge.
  2. Click **Analytics** (`/analytics`).
  3. Showcase the 3 Chart.js graphs:
     - 7-day chore volume bar chart
     - Top completed chores horizontal breakdown
     - Member points distribution doughnut chart
* **On-Screen Card:** `Dynamic Podium Leaderboard · Chart.js Visual Telemetry`
* **Voiceover:**
  > "Motivation thrives on recognition. The Family Leaderboard showcases a podium with medals, weekly velocity sparklines, and active streaks. For deep insights, the Analytics dashboard leverages Chart.js to illustrate chore completion trends, category distributions, and family contribution breakdowns."

---

### Scene 10: Responsive Architecture & Closing (4:35 – 5:00)

* **Visual:**
  1. Open Chrome DevTools (`Cmd + Option + I`) to toggle device emulation.
  2. Demonstrate fluid mobile responsiveness at **375px** (iPhone view): hamburger drawer navigation, stacked Kanban cards, touch-optimized controls.
  3. Resize back to full desktop viewport. Return to the Parent Dashboard.
* **On-Screen Card:** `Responsive Architecture · Angular 17 · PHP 8.4 REST · MySQL 8`
* **Voiceover:**
  > "From mobile screens to desktop workstations, Maple delivers a responsive, accessible experience. Engineered with Angular 17 standalone components and a robust PHP 8.4 REST API, Maple bridges family communication with modern software engineering. Thank you for watching."

---

## 🎙️ Voiceover Pacing & Tone Guidelines

- **Tone:** Authoritative, confident, crisp, and product-focused.
- **Pacing:** 130–145 words per minute. Allow 1–2 seconds of breathing room during view transitions so viewers can absorb the UI.
- **Micro-Pauses:** Pause after clicking action buttons (e.g., after clicking "Approve" or "Create Chore") to let the toast notifications and animations register visually.
- **Audio Quality:** Use a dedicated condenser or directional microphone with gentle noise suppression and normalization.
