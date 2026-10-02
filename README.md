# Maple

**Family Chores & Rewards**

A web application that helps families organize household responsibilities, track completed work, and reward children for their contributions.

*Module 1: Household Responsibility — Web Capstone (MWDWC)*

---

## Overview

Many families manage household responsibilities through conversation, sticky notes, and memory. This often leads to missed chores, uneven workload distribution, and a lack of accountability. Parents lose track of what has been done, and children lack visibility into expectations and progress.

**Maple** is a web-based family coordination platform designed to improve household organization and accountability. The long-term vision is a single place for family life — calendars, groceries, reminders, and meal planning. For this capstone, **Module 1: Household Responsibility** is implemented.

This module lets parents:

- Create and assign chores to their children
- Review completed work and approve or reject it
- Award points through an auditable ledger
- Manage a reward catalog that children can redeem against
- View household performance through a leaderboard and analytics dashboard

## Scope

This capstone ships **Module 1 only**. Modules 2–6 (calendar, groceries, reminders, meal planning, AI assistant) are documented in [`docs/ROADMAP.md`](docs/ROADMAP.md) as future work.

For the full scope of what is and isn't included, see [`docs/SCOPE.md`](docs/SCOPE.md).

## Features

### Authentication & Authorization
- User registration with email and password
- Session-based login and logout
- Role-based access control (parent / child / admin)
- Household invite codes for joining

### Chores
- Create, edit, and soft-delete chores
- Assign chores to one or more children
- Set due dates
- Track status through the lifecycle: pending → submitted → approved/rejected

### Points Ledger
- Append-only transaction log (never mutated)
- Balances computed from `SUM(delta)` rather than stored
- Every point change recorded with reason and reference

### Rewards
- Parent-managed reward catalog
- Children redeem rewards against their points balance
- Parent approval workflow with balance re-check at approval time

### Insights
- Household leaderboard with medals and weekly deltas
- Analytics dashboard: weekly activity, chore stats, member stats

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend (foundation)** | HTML, CSS, JavaScript |
| **Frontend (framework)** | Angular *(planned for Phase 5)* |
| **Backend** | PHP 8 (framework-free) |
| **Database** | MySQL / MariaDB (via XAMPP) |
| **Authentication** | PHP sessions |
| **API Testing** | VS Code REST Client (`tests/api.http`) |
| **Design** | Figma |
| **Version Control** | Git & GitHub |

## Local Setup

### Prerequisites

- PHP 8.1 or higher
- MySQL 5.7 or MariaDB 10.4 (XAMPP works)
- Composer 2.x
- Node.js 18+ (for the frontend, Phase 5)

### Install

1. **Clone the repository**

   ```bash
   git clone https://github.com/snaimio/maple.git
   cd maple
   ```

2. **Install PHP dependencies**

   ```bash
   composer install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database credentials:

   ```
   APP_ENV=local
   APP_URL=http://localhost:8000

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=maple
   DB_USER=root
   DB_PASS=
   ```

4. **Create the database**

   ```bash
   mysql -u root -e "CREATE DATABASE maple CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

5. **Run migrations**

   ```bash
   php migrations/run.php
   ```

6. **Seed demo data**

   ```bash
   php seeders/demo_family.php
   ```

7. **Start the development server**

   ```bash
   php -S localhost:8000 -t public
   ```

   The API is now available at `http://localhost:8000/api/v1`.

### Demo Accounts

After seeding, the following accounts are available:

| Email | Password | Role | Points |
|---|---|---|---|
| alex@maple.test | password123 | Parent | — |
| jamie@maple.test | password123 | Child | 45 |
| riley@maple.test | password123 | Child | 20 |

## Project Structure

```
maple/
├── public/
│   └── index.php              # API entry point
├── src/
│   ├── Core/                  # Framework-free infrastructure
│   │   ├── Database.php       # PDO singleton
│   │   ├── Router.php         # URL routing with {param} support
│   │   ├── Request.php        # Reads method, path, body, query
│   │   ├── Response.php       # JSON responses
│   │   └── Auth.php           # Session management
│   ├── Controllers/           # API controllers
│   │   ├── AuthController.php
│   │   ├── HouseholdController.php
│   │   ├── ChoreController.php
│   │   ├── AssignmentController.php
│   │   ├── CompletionController.php
│   │   ├── RewardController.php
│   │   ├── RedemptionController.php
│   │   ├── LeaderboardController.php
│   │   └── AnalyticsController.php
│   └── Services/
│       └── PointsService.php  # Ledger helper
├── migrations/                # SQL migrations (001–010)
├── seeders/                   # Demo data
├── tests/
│   ├── PointsServiceTest.php
│   └── api.http               # REST Client test file
├── docs/
│   ├── SCOPE.md
│   ├── ROADMAP.md
│   ├── DO_NOT_BUILD.md
│   ├── API_CONTRACT.md
│   ├── PATCHES.md
│   └── erd.dbml
├── logs/                      # Error logs
├── uploads/                   # Future: file uploads
├── .env.example
├── .gitignore
├── composer.json
└── README.md
```

## API Reference

The API follows a consistent contract documented in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

### Base URL

```
http://localhost:8000/api/v1
```

### Endpoints

**Authentication**
- `POST /auth/register` — Create a new user
- `POST /auth/login` — Log in
- `POST /auth/logout` — Log out
- `GET /auth/me` — Current user

**Households**
- `POST /households` — Create household
- `POST /households/join` — Join via invite code
- `GET /households/{id}/members` — List members

**Chores**
- `GET /households/{id}/chores` — List chores
- `POST /households/{id}/chores` — Create chore (parent)
- `PUT /chores/{id}` — Update chore (parent)
- `DELETE /chores/{id}` — Soft delete chore (parent)

**Assignments**
- `POST /chores/{id}/assign` — Assign to children (parent)
- `GET /assignments` — List assignments (with filters)

**Completions**
- `POST /assignments/{id}/complete` — Child submits completion
- `PUT /completions/{id}/approve` — Parent approves
- `PUT /completions/{id}/reject` — Parent rejects

**Rewards**
- `GET /households/{id}/rewards` — List rewards
- `POST /households/{id}/rewards` — Create reward (parent)
- `PUT /rewards/{id}` — Update reward (parent)
- `DELETE /rewards/{id}` — Soft delete reward (parent)

**Redemptions**
- `POST /rewards/{id}/redeem` — Child redeems
- `PUT /redemptions/{id}/approve` — Parent approves
- `PUT /redemptions/{id}/reject` — Parent rejects

**Insights**
- `GET /households/{id}/leaderboard`
- `GET /households/{id}/analytics/weekly`
- `GET /households/{id}/analytics/chores`
- `GET /households/{id}/analytics/members`

### Testing the API

Open `tests/api.http` in VS Code. With the **REST Client** extension installed, a **"Send Request"** link appears above each request. Click it to run the request and see the response.

All endpoints are included in that file, organized by feature, ready to test in order.

## Design

High-fidelity Figma prototype: *(link to be added)*

The prototype includes 9 screens:

1. Login
2. Register
3. Join Household
4. Parent Dashboard
5. Chore Board
6. Create Chore
7. Approvals Queue
8. Child Dashboard
9. Reward Store

## Project Documentation

- [`docs/SCOPE.md`](docs/SCOPE.md) — MVP, nice-to-have, and out-of-scope features
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Modules 2–6 product roadmap
- [`docs/DO_NOT_BUILD.md`](docs/DO_NOT_BUILD.md) — Explicit guardrails against scope creep
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — Response shapes and status codes
- [`docs/PATCHES.md`](docs/PATCHES.md) — Audit trail of corrections
- [`docs/erd.dbml`](docs/erd.dbml) — Database schema source (dbdiagram.io)

## Author

**Sheikh Naim**
MWDWC Web Capstone — triOS College
Instructor: Doug Jasper

---

*Maple — Family Chores & Rewards · Module 1: Household Responsibility*