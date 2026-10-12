# SEBSA Internal Assessment Automation

Knowledge assessment and certification automation platform for SEBSA employees.

## Repository Structure

```
├── documents/       # Project specifications, questionnaires, and 60-question dataset (PDF, CSV, JSON)
└── project/         # Web application codebase (Next.js 14 App Router, TypeScript, Tailwind, MongoDB)
```

### 1. `documents/`
Contains reference materials and data files:
- `SEBSA_Internal_Assessment_Automation_Spec.pdf` — Full product requirements & specifications
- `Confidentiality_Awareness_Assessment.pdf` — Assessment question source document
- `sebsa_assessment_questions_with_answers.json` — 60 cleaned assessment questions with answer keys in JSON format
- `sebsa_assessment_questions_with_answers.csv` — 60 cleaned assessment questions with answer keys in CSV format

### 2. `project/`
Contains the web application:
- **Frontend & Admin/Employee Portals**: Next.js App Router, Tailwind CSS, Lucide Icons, React Hook Form
- **API & Logic**: Next.js API Routes, Role-Based Access Control, JWT HTTP-only cookies
- **Database**: MongoDB Atlas via Mongoose models
- **Certificates & Email**: PDF generation with `pdf-lib`, email delivery with Resend

#### Quick Start for the Web App
```bash
cd project
npm install
npm run dev
```

For database seeding:
```bash
cd project
npm run db:seed
```
