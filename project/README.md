# SEBSA Internal Assessment Automation â€” Web Application

> Internal knowledge assessment portal for SEBSA employees.
> Built with **Next.js 14 (App Router)** Â· **TypeScript** Â· **Tailwind CSS** Â· **MongoDB (Mongoose)** Â· **pdf-lib** Â· **Resend**

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- A MongoDB database (MongoDB Atlas or a local MongoDB instance)
- A [Resend](https://resend.com) account for transactional email

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create `.env.local` and configure the database, authentication, and email settings:
```env
MONGODB_URI=mongodb://localhost:27017/sebsa_assessment
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
BREVO_API_KEY=replace-with-your-server-only-brevo-key
```

### 4. (Optional) Seed initial data
```bash
npm run db:seed
```

The seed script creates the default administrator, sample employees, an active
assessment cycle, and questions when they do not already exist.

### 5. Start the development server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
â”œâ”€â”€ app/                        # Next.js App Router
â”‚   â”œâ”€â”€ (auth)/login/           # Login page (FR-01)
â”‚   â”œâ”€â”€ (employee)/             # Employee-facing pages
â”‚   â”‚   â”œâ”€â”€ dashboard/          # Employee home / active cycle prompt (FR-02)
â”‚   â”‚   â”œâ”€â”€ assessment/         # Take the assessment (FR-03â€“FR-06)
â”‚   â”‚   â””â”€â”€ certificates/       # View & download past certificates (FR-09)
â”‚   â”œâ”€â”€ (admin)/admin/          # Admin-facing pages
â”‚   â”‚   â”œâ”€â”€ questions/          # Question bank management (FR-11)
â”‚   â”‚   â”œâ”€â”€ employees/          # Employee list management (FR-12)
â”‚   â”‚   â”œâ”€â”€ cycles/             # Start a cycle / send assessment (FR-13)
â”‚   â”‚   â””â”€â”€ tracker/            # Completion tracker dashboard (FR-15)
â”‚   â””â”€â”€ api/                    # Next.js Route Handlers (backend)
â”‚       â”œâ”€â”€ auth/               # Login / logout
â”‚       â”œâ”€â”€ questions/          # CRUD questions
â”‚       â”œâ”€â”€ employees/          # CRUD employees
â”‚       â”œâ”€â”€ cycles/             # Create cycle + bulk email
â”‚       â”œâ”€â”€ attempts/           # Submit assessment + score + certificate
â”‚       â””â”€â”€ certificates/       # Download / re-issue certificates
â”‚
â”œâ”€â”€ components/                 # Reusable React components
â”‚   â”œâ”€â”€ ui/                     # Base UI (Button, Input, Modal, Tableâ€¦)
â”‚   â”œâ”€â”€ forms/                  # Form components (LoginForm, QuestionFormâ€¦)
â”‚   â”œâ”€â”€ admin/                  # Admin-specific components (Tracker, QuestionListâ€¦)
â”‚   â”œâ”€â”€ employee/               # Employee-specific components (AssessmentFormâ€¦)
â”‚   â”œâ”€â”€ certificate/            # Certificate preview component
â”‚   â””â”€â”€ layout/                 # Navbar, Sidebar, PageWrapper
â”‚
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ auth/                   # bcrypt hashing + JWT sign/verify
â”‚   â”œâ”€â”€ db/                     # Mongoose connection (re-export)
â”‚   â”œâ”€â”€ email/                  # Resend: invitation + certificate emails
â”‚   â”œâ”€â”€ pdf/                    # pdf-lib certificate generator
â”‚   â””â”€â”€ utils/                  # Shuffle, scoring, helpers
â”‚
â”œâ”€â”€ db/
â”‚   â”œâ”€â”€ index.ts                # Mongoose connection and connection cache
â”‚   â””â”€â”€ models/                 # Mongoose models and schemas
â”‚
â”œâ”€â”€ types/index.ts              # Shared TypeScript types
â”œâ”€â”€ schemas/index.ts            # Zod validation schemas
â”œâ”€â”€ hooks/                      # Custom React hooks
â”œâ”€â”€ context/                    # React context providers
â””â”€â”€ middleware.ts               # JWT auth + RBAC route protection

public/
â”œâ”€â”€ assets/
â”‚   â”œâ”€â”€ images/                 # General images
â”‚   â”œâ”€â”€ fonts/                  # Custom fonts
â”‚   â””â”€â”€ branding/               # SEBSA logo + brand assets
â””â”€â”€ templates/certificate/      # Certificate template assets

tests/
â”œâ”€â”€ unit/                       # Jest unit tests
â”œâ”€â”€ integration/                # API integration tests
â””â”€â”€ e2e/                        # Playwright end-to-end tests
```

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Simple, modern UI; single deployable |
| Backend | Next.js App Router Route Handlers (TypeScript) | One language across the stack |
| Database | MongoDB + Mongoose | Document database with typed application models |
| Auth | bcryptjs + JWT (jose) | Company email+password; SSO-ready later |
| PDF | pdf-lib | Server-side, no browser needed |
| Email | Resend | Reliable delivery, SPF/DKIM support |
| Validation | Zod + react-hook-form | End-to-end type-safe validation |

---

## Key Spec Requirements Mapping

| Spec ID | Requirement | Implementation |
|---|---|---|
| FR-01 | Employee login | `/login` + `/api/auth` |
| FR-03/04 | Random + shuffled 10 questions | `lib/utils/index.ts` â€” `selectRandomQuestions`, `shuffle` |
| FR-06 | Auto-scoring | `lib/utils/index.ts` â€” `scoreAttempt` |
| FR-07/08 | Certificate PDF + email | `lib/pdf`, `lib/email` |
| FR-10 | Attempt policy per cycle | `api/attempts` â€” attempt and invitation checks |
| FR-11 | Question bank management | `api/questions` |
| FR-12 | Employee management | `api/employees` |
| FR-13 | Start cycle + bulk email | `api/cycles` |
| FR-15 | Completion tracker | `(admin)/admin/tracker` |
| Sec 13 | Security | `middleware.ts` + bcrypt + httpOnly JWT cookie |

---

## Environment Variables

The application reads environment variables from `.env.local`. The required
settings are `MONGODB_URI`, `JWT_SECRET`, and `RESEND_API_KEY`. Additional
email configuration may be required by the Resend integration.

---

## License

Internal use only â€” SEBSA.
