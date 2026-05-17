# H2GO — Frontend

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/HeroUI-beta-7C3AED?style=flat-square" alt="HeroUI" />
</p>

The frontend is a **Next.js 16** web application (App Router) that provides the user interface for the H2GO platform. It allows organizations to manage hydrogen production records, issue and transfer Guarantees of Origin (GOs), and handle multi-party approval workflows.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Pages & Routing](#pages--routing)
- [Docker](#docker)

## Features

- 🔐 **Authentication** — Login page with JWT cookie-based session management
- 📊 **Dashboard** — Central hub for all blockchain operations
- ⚡ **Production Registration** — Register hydrogen production on-chain
- 📜 **GO Management** — View, issue, and track Guarantees of Origin
- 🔄 **Request Workflows** — Create and approve multi-party GO requests
- 👥 **Organization Management** — View organization details and user profiles
- 🛡️ **Authorization Controls** — Role-based access per organization type
- 🧑‍💻 **Developer Tools** — Admin panel for development/testing operations

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Login / landing page
│   │   ├── layout.tsx                  # Root layout (fonts, providers)
│   │   ├── globals.css                 # Global styles & Tailwind config
│   │   ├── middleware.ts               # Auth middleware (route protection)
│   │   │
│   │   ├── components/
│   │   │   ├── dashboard-nav.tsx       # Sidebar navigation
│   │   │   ├── nav-logo.tsx            # Brand logo component
│   │   │   ├── feature-card.tsx        # Dashboard feature cards
│   │   │   ├── icons.tsx               # SVG icon components
│   │   │   ├── toast-provider.tsx      # Toast notification system
│   │   │   ├── assetTypeSelector.tsx   # Asset type dropdown
│   │   │   └── editUserModalBody.tsx   # User edit modal form
│   │   │
│   │   ├── context/                    # React context providers
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Dashboard shell (nav + content)
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── gdos/                   # GO listing & details
│   │   │   ├── gdo-operations/         # GO transfer & redemption
│   │   │   ├── requests/               # Request workflow pages
│   │   │   ├── register-production/    # Production registration form
│   │   │   ├── organization/           # Organization profile
│   │   │   ├── authorizations/         # Authorization management
│   │   │   └── developer/              # Developer/admin tools
│   │   │
│   │   └── types/                      # TypeScript type definitions
│   │
│   └── middleware.ts                   # Next.js middleware
│
├── public/                             # Static assets (favicon, images)
├── Dockerfile
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc
└── package.json
```

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16 | React framework (App Router) |
| [React](https://react.dev/) | 19 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first CSS |
| [HeroUI](https://heroui.com/) | 3.0.0-beta | Component library |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 LTS
- **pnpm** ≥ 9
- **Backend API** running at `http://localhost:3003` (see [Backend README](../backend/README.md))

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```ini
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:3003
NEXT_PUBLIC_REE_ORG_ID=UUID-OF-REE-ORG
NEXT_PUBLIC_ENAGAS_GTS_ORG_ID=UUID-OF-ENAGAS-GTS-ORG
```

## Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/` | Login | Authentication page |
| `/dashboard` | Dashboard Home | Overview & navigation |
| `/dashboard/gdos` | GOs | View all Guarantees of Origin |
| `/dashboard/gdo-operations` | GO Operations | Transfer & redeem GOs |
| `/dashboard/requests` | Requests | Multi-party request workflows |
| `/dashboard/register-production` | Register Production | Log hydrogen production |
| `/dashboard/organization` | Organization | View/edit org profile |
| `/dashboard/authorizations` | Authorizations | Manage user authorizations |
| `/dashboard/developer` | Developer Tools | Admin/dev panel |

All `/dashboard/*` routes are protected by authentication middleware.

## Docker

```bash
# Build
docker build -t h2go-frontend .

# Run
docker run -p 3000:3000 --env-file .env h2go-frontend
```

Or use Docker Compose from the project root:

```bash
docker compose up frontend
```

---

<p align="center">
  <a href="../backend/README.md">⬅ Backend</a> · <a href="../README.md">Root</a> · <a href="../blockchain/README.md">Blockchain ➡</a>
</p>
