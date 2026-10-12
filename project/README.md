# SEBSA Internal Assessment Automation — Web Application

> Internal knowledge assessment portal for SEBSA employees.
> Built with **Next.js 14 (App Router)** · **TypeScript** · **Tailwind CSS** · **PostgreSQL (Drizzle ORM)** · **pdf-lib** · **Resend**

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase, Neon, local Docker, etc.)
- A [Resend](https://resend.com) account for transactional email

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
# Edit .env.local and fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY etc.
```

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. (Optional) Seed initial data
```bash
npm run db:seed
```

### 6. Start the development server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/login/           # Login page (FR-01)
│   ├── (employee)/             # Employee-facing pages
│   │   ├── dashboard/          # Employee home / active cycle prompt (FR-02)
│   │   ├── assessment/         # Take the assessment (FR-03–FR-06)
│   │   └── certificates/       # View & download past certificates (FR-09)
│   ├── (admin)/admin/          # Admin-facing pages
│   │   ├── questions/          # Question bank management (FR-11)
│   │   ├── employees/          # Employee list management (FR-12)
│   │   ├── cycles/             # Start a cycle / send assessment (FR-13)
│   │   └── tracker/            # Completion tracker dashboard (FR-15)
│   └── api/                    # Next.js API routes (backend)
│       ├── auth/               # Login / logout
│       ├── questions/          # CRUD questions
│       ├── employees/          # CRUD employees
│       ├── cycles/             # Create cycle + bulk email
│       ├── attempts/           # Submit assessment + score + certificate
│       └── certificates/       # Download / re-issue certificates
│
├── components/                 # Reusable React components
│   ├── ui/                     # Base UI (Button, Input, Modal, Table…)
│   ├── forms/                  # Form components (LoginForm, QuestionForm…)
│   ├── admin/                  # Admin-specific components (Tracker, QuestionList…)
│   ├── employee/               # Employee-specific components (AssessmentForm…)
│   ├── certificate/            # Certificate preview component
│   └── layout/                 # Navbar, Sidebar, PageWrapper
│
├── lib/
│   ├── auth/                   # bcrypt hashing + JWT sign/verify
│   ├── db/                     # Drizzle ORM connection (re-export)
│   ├── email/                  # Resend: invitation + certificate emails
│   ├── pdf/                    # pdf-lib certificate generator
│   └── utils/                  # Shuffle, scoring, helpers
│
├── db/
│   ├── index.ts                # Drizzle connection + pool
│   ├── schema.ts               # All table definitions
│   ├── migrations/             # Auto-generated SQL migrations
│   └── seeds/                  # Seed scripts
│
├── types/index.ts              # Shared TypeScript types
├── schemas/index.ts            # Zod validation schemas
├── hooks/                      # Custom React hooks
├── context/                    # React context providers
└── middleware.ts               # JWT auth + RBAC route protection

public/
├── assets/
│   ├── images/                 # General images
│   ├── fonts/                  # Custom fonts
│   └── branding/               # SEBSA logo + brand assets
└── templates/certificate/      # Certificate template assets

tests/
├── unit/                       # Jest unit tests
├── integration/                # API integration tests
└── e2e/                        # Playwright end-to-end tests
```

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Simple, modern UI; single deployable |
| Backend | Next.js API Routes (TypeScript) | One language across the stack |
| Database | PostgreSQL + Drizzle ORM | Relational; managed hosting removes ops overhead |
| Auth | bcryptjs + JWT (jose) | Company email+password; SSO-ready later |
| PDF | pdf-lib | Server-side, no browser needed |
| Email | Resend | Reliable delivery, SPF/DKIM support |
| Validation | Zod + react-hook-form | End-to-end type-safe validation |

---

## Key Spec Requirements Mapping

| Spec ID | Requirement | Implementation |
|---|---|---|
| FR-01 | Employee login | `/login` + `/api/auth` |
| FR-03/04 | Random + shuffled 10 questions | `lib/utils/index.ts` — `selectRandomQuestions`, `shuffle` |
| FR-06 | Auto-scoring | `lib/utils/index.ts` — `scoreAttempt` |
| FR-07/08 | Certificate PDF + email | `lib/pdf`, `lib/email` |
| FR-10 | One attempt per cycle | `api/attempts` — duplicate check |
| FR-11 | Question bank management | `api/questions` |
| FR-12 | Employee management | `api/employees` |
| FR-13 | Start cycle + bulk email | `api/cycles` |
| FR-15 | Completion tracker | `(admin)/admin/tracker` |
| Sec 13 | Security | `middleware.ts` + bcrypt + httpOnly JWT cookie |

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

---

## License

Internal use only — SEBSA.
