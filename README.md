# MCI HR System

A full-stack HR management system for the Media Challenge Initiative, built
with Next.js (App Router), PostgreSQL, and Prisma.

## Tech stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Frontend**: React 19, Tailwind CSS v4
- **Backend**: Next.js Route Handlers (no separate Express layer — see
  "Why no separate backend" below)
- **Database**: PostgreSQL
- **ORM**: Prisma 7, via the `@prisma/adapter-pg` driver adapter
- **Auth**: Custom JWT session (via `jose`), cookie-based, with a
  database-driven RBAC system — see "Auth & RBAC" below
- **Testing**: Vitest (unit), Playwright (E2E, planned)

### Why no separate Express backend

Next.js Route Handlers run on a full Node.js runtime and can talk to
Postgres directly via Prisma — there's no capability an Express layer would
add here that isn't already available. Splitting into two services would
mean two deployables, a second auth boundary to keep in sync, and network
hops between them for no functional gain at this scale. If this system
later needs to expose an API to non-web clients that must evolve
independently of the web app's release cycle, that's the point to revisit
this decision.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ running locally (or reachable via `DATABASE_URL`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database setup

Create a dedicated database and role (don't reuse your Postgres superuser —
scope the app's DB credentials to only what it needs):

```bash
createuser mci_hr --createdb
psql postgres -c "ALTER USER mci_hr WITH PASSWORD 'mci_hr_dev_password';"
createdb mci_hr_dev -O mci_hr
```

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env` if your database credentials differ from the defaults above, and
generate a real session secret:

```bash
openssl rand -base64 32   # paste the output into SESSION_SECRET in .env
```

### 4. Run migrations

```bash
npm run db:migrate
```

This applies `prisma/migrations/` to your database, creating all tables.
Prisma migrations are the source of truth for schema history — see
`prisma/schema.prisma` for the current model definitions.

### 5. Seed reference data

```bash
npm run db:seed
```

This creates the RBAC roles/permissions, common leave types, and a
bootstrap HR Administrator account you can log in with immediately:

- **Email**: `admin@mediachallenge.org`
- **Password**: `ChangeMe123!`

Change or retire this account before any real deployment — it exists so
there's a way into the system before real employees are created.

### 6. Start the dev server

```bash
npm run dev
```

Visit the URL it prints (defaults to `http://localhost:3000`, but picks the
next free port if that's already in use).

### Other useful commands

| Command | What it does |
| --- | --- |
| `npm run db:studio` | Opens Prisma Studio, a GUI for browsing/editing your database |
| `npm run db:reset` | Drops and recreates the database, re-running migrations and the seed |
| `npm run build` | Production build (also runs TypeScript checks) |
| `npm run lint` | ESLint |

## Auth & RBAC

Login is email + password, backed by a JWT stored in an HTTP-only cookie
(see `src/lib/session.ts`). There's no third-party auth provider — see the
code comments in `src/app/actions/auth.ts` for why a lightweight custom
implementation was chosen over NextAuth.js for this project.

Roles and permissions are **database rows**, not hardcoded enums
(`prisma/schema.prisma`: `Role`, `Permission` models). Application code
only ever checks "does this session have permission X"
(`src/lib/rbac/check.ts`) — it never branches on a role's name directly for
access control. This means adding a new role, or changing what an existing
role can do, is a data change (`src/lib/rbac/permissions.ts` +
`prisma/seed.ts`), not a code change.

Current roles: Employee, Line Manager, HR Administrator, Finance Officer,
Senior Management.

## Feature status

Built so far, in dependency order:

1. ✅ Project scaffold, Prisma + Postgres, auth/RBAC
2. ✅ Employee Database (US-HR-001) — create, view, search/filter, offboard
   (archive, not hard-delete)
3. ⏳ Attendance & Time Tracker
4. ⏳ Leave Management
5. ⏳ Payroll and Processing
6. ⏳ Document Repository
7. ⏳ Employee Self-Service Portal

## Notes for production

- **Sensitive fields**: `Employee.salary`, `bankName`, `bankAccountNumber`,
  `tin`, and `nssfNumber` are stored as plaintext columns in this dev build
  (see the comment block above them in `prisma/schema.prisma`). Before any
  real deployment, add column-level or application-level encryption at rest
  (e.g. Postgres `pgcrypto`, or field encryption via a library like
  `@47ng/cloak` backed by a KMS-managed key), restrict the database role the
  app connects as to the minimum it needs, and enable disk-level encryption
  on the database volume.
- **Email**: `src/lib/email/index.ts` defines an `EmailProvider` interface
  with only a console-logging dev implementation (no SMTP/API credentials
  are configured). Swap in a real provider (SES, Resend, etc.) by
  implementing that interface — no call sites need to change.
- **File storage**: not yet built (needed starting with the Document
  Repository feature) — will follow the same pluggable-interface pattern as
  email, targeting local disk for now with an S3-compatible swap path.
- **Session secret**: `SESSION_SECRET` in `.env` is a dev-only value.
  Generate a fresh one per environment and never commit it.
- **Payroll tax rates**: NSSF (`src/lib/payroll/config.ts`) and PAYE
  (`src/lib/payroll/paye.ts`) use commonly-published Uganda rates/bands,
  not figures verified against a current Uganda Revenue Authority
  publication. Confirm with Finance/URA before relying on this for real
  payroll — the calculation mechanism is correct, but tax law changes over
  time and these constants need to be kept current.
