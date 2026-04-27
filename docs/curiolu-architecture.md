# Curiolu — Antique Collection Management System

## Architecture Plan & Claude Code Build Sequence

---

## 1. Project Overview

**Curiolu** is a multi-tenant SaaS collection management system for tracking antiques and decorative arts — furniture, porcelain, textiles, rugs, silver, paintings, and other collectibles. It supports detailed cataloging with photos, provenance, valuations, vendor history, and produces museum-quality PDF output for both catalog presentation and insurance documentation.

The app is designed from day one for eventual public availability with paid subscription tiers. Initially it launches as a private instance for a single user, but all data isolation, auth, registration, and subscription scaffolding are built to support opening to the public without architectural changes.

### Core Capabilities

- **Collection Items** with base fields + user-defined custom types (JSONB extension)
- **Photo Management** with S3/Linode Object Storage, thumbnails, ordering
- **Vendor/Dealer Management** as first-class entities with purchase history
- **Valuation Tracking** — purchase price, estimated value, appraisal values over time
- **PDF Generation** — Christie's catalog card style + insurance documentation sheet
- **Batch PDF** — full room inventory as multi-page documents
- **AI Assist** — style/period identification, condition notes from photos (Anthropic Vision API)
- **Value Analytics** — collection value by room, trends over time, insurance coverage gaps
- **Shareable Views** — read-only links for appraisers and insurers (token-based)
- **Multi-Tenant Architecture** — full user data isolation, per-user S3 namespacing, tenant-scoped queries
- **Subscription-Ready** — plan tiers with feature/limit gating, Stripe integration placeholder

---

## 2. Recommended Tech Stack

### Frontend

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | Vercel-native, RSC for data-heavy pages, API routes for backend logic |
| **Language** | TypeScript | Type safety across the full stack, especially important for JSONB custom field schemas |
| **Styling** | Tailwind CSS 4 | Utility-first, fast iteration, strong ecosystem |
| **Component Library** | shadcn/ui | Unstyled primitives you own — no vendor lock-in, excellent form controls for complex data entry |
| **Forms** | React Hook Form + Zod | Dynamic form generation from custom type schemas, runtime validation |
| **State** | Zustand (minimal) | Lightweight client state for UI concerns; most state lives server-side via RSC |
| **Tables/Data** | TanStack Table | Sortable, filterable collection views with column customization |
| **Charts** | Recharts | Value trends, coverage gap visualizations |
| **Drag & Drop** | dnd-kit | Photo reordering, room arrangement |
| **Image Handling** | next/image + sharp | Responsive images, automatic optimization, LQIP placeholders |

### Backend (all within Next.js)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Runtime** | Next.js API Routes + Server Actions | Colocated with frontend, Vercel-optimized |
| **Database** | Vercel Postgres (Neon) | Managed, serverless-friendly, native JSONB support |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent Postgres/JSONB support, generates migrations |
| **Auth** | NextAuth.js v5 (Auth.js) | Email/password for owner + magic link invites for share recipients |
| **File Storage** | Linode Object Storage (S3-compatible) | AWS SDK v3, presigned URLs for direct upload |
| **PDF Generation** | @react-pdf/renderer | React component model for pixel-perfect PDFs, runs server-side |
| **AI** | Anthropic SDK (direct API) | Claude vision for photo analysis, text generation for provenance descriptions |
| **Background Jobs** | Vercel Cron + Inngest (or QStash) | Thumbnail generation, batch PDF processing |
| **Search** | Postgres full-text search (tsvector) | Sufficient at current scale; no need for Elasticsearch. Tenant-scoped queries keep result sets small. |

### Infrastructure

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Hosting** | Vercel | Zero-config Next.js deployment, preview deploys, edge functions |
| **Database** | Vercel Postgres (Neon serverless) | Auto-scaling, branching for dev/preview |
| **Object Storage** | Linode Object Storage | S3-compatible, cost-effective for photos |
| **CDN** | Vercel Edge Network | Automatic for static assets + ISR |
| **Monitoring** | Vercel Analytics + Sentry | Error tracking, performance monitoring |

### Why Not Rails?

Rails would work — you know it well and it handles this domain naturally. But for this project specifically:

- **Vercel deployment** is a hard requirement, and Next.js is native there
- **React-based PDF rendering** (`@react-pdf/renderer`) gives you component-level control over PDF layouts using the same mental model as the UI
- **Server Components** eliminate the API layer for read-heavy pages (collection browsing, analytics dashboards)
- **Dynamic form generation** from JSONB schemas is more natural in React (render form fields from schema objects) than in ERB/Hotwire
- **TypeScript end-to-end** means your Drizzle schema, Zod validators, form types, and API contracts are all type-checked together

The tradeoff: you lose Rails conventions and the "everything has a place" philosophy. Drizzle + Next.js requires more explicit wiring. But for an app this UI-heavy with complex form dynamics and dual PDF templates, React is the stronger fit.

---

## 3. Local Development Environment Setup

These are the steps to set up your local dev environment on Fedora (or any Linux/macOS machine) **before** you start building with Claude Code.

### Prerequisites

```bash
# Node.js 20+ (LTS) — use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x

# pnpm (recommended over npm for speed and disk efficiency)
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

# Git (should already be installed on Fedora)
git --version
```

### Editor Setup (Neovim)

Since you use Neovim, ensure these LSP/tooling plugins are configured:

- **typescript-language-server** — TypeScript/JSX intellisense
- **tailwindcss-language-server** — Tailwind class autocomplete and linting
- **eslint** via nvim-lspconfig or none-ls
- **prettier** as your formatter (configured in the project)

If using lazy.nvim, the key plugins are `nvim-lspconfig`, `mason.nvim` (to install LSP servers), and `conform.nvim` (for format-on-save with Prettier).

### Clone & Install

```bash
# After Claude Code creates the project scaffold (Prompt 0)
cd ~/projects  # or wherever you keep code
git init curiolu
cd curiolu

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables (.env.local)

Fill in these values after completing the Vercel and Linode setup (Section 4 below):

```env
# Database — from Vercel Postgres dashboard
DATABASE_URL="postgresql://user:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth — generate a random secret
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"

# Linode Object Storage — from Linode Cloud Manager
LINODE_ACCESS_KEY="your-access-key"
LINODE_SECRET_KEY="your-secret-key"
LINODE_ENDPOINT="https://us-east-1.linodeobjects.com"
LINODE_BUCKET="curiolu-photos"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Vercel Flags SDK — required for Flags Explorer toolbar overrides
# Generate at: https://generate-secret.vercel.app/32
FLAGS_SECRET="your-32-char-base64-secret"

# Stripe (placeholder — not needed until subscriptions launch)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRO_PRICE_ID=""
STRIPE_PREMIUM_PRICE_ID=""
```

### Database Setup

```bash
# Push the Drizzle schema to your Vercel Postgres database
pnpm drizzle-kit push

# Or generate and run migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Seed default collection item types
pnpm tsx src/db/seed.ts

# Open Drizzle Studio to inspect your database (optional, great for debugging)
pnpm drizzle-kit studio
```

### Running the Dev Server

```bash
# Start the Next.js dev server
pnpm dev

# App is available at http://localhost:3000
# First visit: log in with the admin account created via create-admin.ts
# Or if REGISTRATION_OPEN=true, you can register a new account at /register
```

### Development Workflow with Claude Code

```bash
# Typical session: open a terminal for the dev server, another for Claude Code
# Terminal 1:
pnpm dev

# Terminal 2:
claude  # start Claude Code in the project directory

# Claude Code can read/write project files, run commands, and test changes
# while the dev server hot-reloads
```

### Useful Dev Commands

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build (catches type errors)
pnpm lint             # ESLint check
pnpm drizzle-kit studio   # Visual database browser at https://local.drizzle.studio
pnpm drizzle-kit push     # Push schema changes to database
pnpm drizzle-kit generate # Generate migration files
pnpm tsx src/db/seed.ts   # Seed plan_limits + default item types
pnpm tsx src/db/create-admin.ts --email=you@example.com --password=yourpassword
                          # Create your admin account (run once)
```

---

## 4. Vercel & Infrastructure Setup

Complete these steps **before** starting the Claude Code build prompts.

### 4a. Vercel Project Setup

1. **Create a Vercel account** at [vercel.com](https://vercel.com) if you don't have one.

2. **Install the Vercel CLI:**
   ```bash
   pnpm i -g vercel
   vercel login
   ```

3. **Create the project on Vercel:**
   After Claude Code scaffolds the project (Prompt 0), link it:
   ```bash
   cd curiolu
   vercel link
   # Select "Create a new project"
   # Framework: Next.js (auto-detected)
   # Root directory: ./
   ```

4. **Configure environment variables on Vercel:**
   Go to your project Settings → Environment Variables in the Vercel dashboard.
   Add all variables from `.env.local` (see above). Set them for Production,
   Preview, and Development environments.

   Alternatively, use the CLI:
   ```bash
   vercel env add DATABASE_URL
   vercel env add AUTH_SECRET
   vercel env add LINODE_ACCESS_KEY
   vercel env add LINODE_SECRET_KEY
   vercel env add LINODE_ENDPOINT
   vercel env add LINODE_BUCKET
   vercel env add ANTHROPIC_API_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   vercel env add FLAGS_SECRET  # Generate at https://generate-secret.vercel.app/32
   # Set NEXT_PUBLIC_APP_URL to your production URL (e.g., https://curiolu.vercel.app)
   ```

5. **Connect your Git repository:**
   - Create a repo on GitHub (private recommended for a personal app)
   - Push the scaffold: `git remote add origin <url> && git push -u origin main`
   - In Vercel dashboard, connect the GitHub repo
   - Every push to `main` auto-deploys to production
   - Every PR gets a preview deployment

### 4b. Neon Postgres Setup (via Vercel Marketplace)

**Important:** The old "Vercel Postgres" product no longer exists. Vercel now uses Neon as a Marketplace integration. You have two options:

**Option A: Create through Vercel (recommended for this project)**

This keeps billing consolidated in Vercel and auto-injects env vars.

1. Go to the [Neon integration on Vercel Marketplace](https://vercel.com/marketplace/neon)
2. Click **Install** → **Create New Neon Account** (or link existing)
3. Accept terms, pick a region (`us-east-1` is closest to Charlottesville), select the **Free Plan** (generous for solo dev — 0.5 GB storage, 190 compute hours/month)
4. Name the database `curiolu` → Click **Create**
5. You land on the Vercel **Storage** tab. Click **Connect Project** → select your Vercel project → check **Development**, **Preview**, and **Production** environments → **Connect**
6. Vercel auto-injects `DATABASE_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` into your project env vars

   Pull them locally:
   ```bash
   vercel env pull .env.local
   ```
   This writes all the database credentials (and any other Vercel env vars) into your local `.env.local`. Your local dev server connects to the same Neon database over the internet — no local Postgres needed.

7. Click **Open in Neon** from the Storage tab to access the full Neon Console (branching, SQL editor, monitoring)

**Option B: Create directly on Neon, connect manually**

If you already have a Neon account or prefer to keep billing separate:

1. Go to [console.neon.tech](https://console.neon.tech) → Create Project
2. Name it `curiolu`, select region `us-east-1`
3. Copy the connection string from the **Connect** widget
4. In Vercel: Project Settings → Environment Variables → add `DATABASE_URL` with the connection string for all environments
5. Pull locally: `vercel env pull .env.local`

**Either option gives you the same result:** a Neon Postgres database accessible from both your local dev server and Vercel deployments via a single `DATABASE_URL`.

**Database branching (optional, recommended later):**
- Enable in Vercel: Storage → your database → Connect Project → Deployments Configuration → toggle **Preview**
- Each PR preview deploy gets its own copy-on-write database branch
- Not needed during initial build — add this once you have data worth protecting

### 4c. Linode Object Storage Setup

1. **Create a bucket in Linode Cloud Manager:**
   - Go to [cloud.linode.com](https://cloud.linode.com) → Object Storage
   - Create a bucket:
     - Label: `curiolu-photos`
     - Region: `us-east-1` (Newark) or closest to you
   - Note the endpoint URL (e.g., `https://us-east-1.linodeobjects.com`)

2. **Generate access keys:**
   - Object Storage → Access Keys → Create Access Key
   - Label: `curiolu-app`
   - Permissions: Limited — select only the `curiolu-photos` bucket, Read/Write
   - Save the Access Key and Secret Key immediately (secret is shown only once)

3. **Configure CORS on the bucket:**
   This is required for direct browser-to-S3 uploads via presigned URLs.

   Using the Linode CLI or s3cmd:
   ```bash
   # Install s3cmd if not present
   pip install s3cmd --break-system-packages

   # Configure s3cmd for Linode
   s3cmd --configure
   # Access Key: your-access-key
   # Secret Key: your-secret-key
   # S3 Endpoint: us-east-1.linodeobjects.com
   # DNS-style bucket+hostname: %(bucket)s.us-east-1.linodeobjects.com

   # Set CORS policy
   cat > /tmp/cors.xml << 'EOF'
   <CORSConfiguration>
     <CORSRule>
       <AllowedOrigin>http://localhost:3000</AllowedOrigin>
       <AllowedOrigin>https://curiolu.vercel.app</AllowedOrigin>
       <AllowedOrigin>https://*.vercel.app</AllowedOrigin>
       <AllowedMethod>GET</AllowedMethod>
       <AllowedMethod>PUT</AllowedMethod>
       <AllowedMethod>HEAD</AllowedMethod>
       <AllowedHeader>*</AllowedHeader>
       <MaxAgeSeconds>3600</MaxAgeSeconds>
     </CORSRule>
   </CORSConfiguration>
   EOF

   s3cmd setcors /tmp/cors.xml s3://curiolu-photos
   ```

   Update the `AllowedOrigin` values to match your actual Vercel production URL
   and any custom domain you add later.

4. **Verify access:**
   ```bash
   s3cmd ls s3://curiolu-photos
   # Should return empty (no objects yet) without errors
   ```

### 4d. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key for the Curiolu project
3. Add credit/billing if not already set up
4. The AI analysis feature uses Claude's vision capabilities — costs are
   roughly $0.01–0.05 per analysis depending on photo count and resolution

### 4e. Custom Domain (Optional)

1. **In Vercel dashboard:** Project Settings → Domains → Add Domain
2. Enter your domain (e.g., `home.custerdesign.com` or `curiolu.custerdesign.com`)
3. Vercel will show DNS records to add:
   - For a subdomain: add a CNAME record pointing to `cname.vercel-dns.com`
   - For an apex domain: add an A record to `76.76.21.21`
4. Vercel auto-provisions SSL certificates
5. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to the custom domain
6. Update the CORS `AllowedOrigin` on the Linode bucket to include the new domain

### 4f. Deployment Checklist

Before your first production deployment, verify:

- [ ] Vercel project linked and connected to GitHub
- [ ] Vercel Postgres provisioned and `DATABASE_URL` set
- [ ] Database schema pushed (`pnpm drizzle-kit push`)
- [ ] Seed data loaded (`pnpm tsx src/db/seed.ts`) — creates plan_limits + default item types
- [ ] Admin user created (`pnpm tsx src/db/create-admin.ts --email=... --password=...`)
- [ ] Linode bucket created with CORS configured
- [ ] Linode access keys set in Vercel env vars
- [ ] Anthropic API key set in Vercel env vars
- [ ] `AUTH_SECRET` generated and set (`openssl rand -base64 32`)
- [ ] `FLAGS_SECRET` generated and set (from `generate-secret.vercel.app/32`)
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] Feature flags default: `ai-enabled=false`, `registration-open=false`, `subscriptions-enabled=false`
- [ ] First push to `main` triggers successful deployment
- [ ] Visit production URL → login page loads (registration closed)
- [ ] Log in with admin account → dashboard loads

---

## 5. Data Model

### Core Schema (Drizzle ORM)

```
┌─────────────────────┐     ┌─────────────────────────┐
│   users              │     │   collection_item_types  │
│─────────────────────│     │─────────────────────────│
│ id (uuid, PK)       │     │ id (uuid, PK)           │
│ email (unique)       │     │ user_id (FK → users)     │
│ name                │     │ name (e.g. "Furniture")  │
│ password_hash        │     │ slug                    │
│ role (owner|admin)   │     │ description             │
│ plan (free|pro|      │     │ icon                    │
│   premium|admin)     │     │ field_schema (JSONB)    │
│ stripe_customer_id   │     │ display_order           │
│ stripe_subscription  │     │ is_default (boolean)    │
│   _id               │     │ created_at              │
│ plan_valid_until     │     │ updated_at              │
│ is_active (boolean)  │     └─────────────────────────┘
│ created_at           │
│ updated_at           │
└─────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────────────────────────────────────────┐
│   collection_items                                    │
│──────────────────────────────────────────────────────│
│ id (uuid, PK)                                        │
│ user_id (FK → users)                                 │
│ item_type_id (FK → collection_item_types)            │
│                                                       │
│ -- Base fields (common to all types) --               │
│ title                                                 │
│ description (text)                                    │
│ period (e.g. "Mid-18th Century")                     │
│ style (e.g. "Rococo", "Gothic Revival")              │
│ origin_country                                        │
│ origin_region                                         │
│ maker_attribution                                     │
│ materials (text[])                                    │
│ condition (enum: excellent|very_good|good|fair|poor) │
│ condition_notes (text)                                │
│                                                       │
│ -- Dimensions (inches, stored as decimal) --          │
│ height / width / depth                                │
│ diameter (for round items)                            │
│ weight                                                │
│                                                       │
│ -- Location --                                        │
│ room                                                  │
│ position_in_room                                      │
│                                                       │
│ -- Custom fields --                                   │
│ custom_fields (JSONB)                                 │
│                                                       │
│ -- Provenance --                                      │
│ provenance_narrative (text)                           │
│ provenance_references (text)                          │
│                                                       │
│ -- Notes --                                           │
│ notes (text)                                          │
│ tags (text[])                                         │
│                                                       │
│ -- Metadata --                                        │
│ status (enum: active|sold|gifted|stored|on_loan)     │
│ created_at                                            │
│ updated_at                                            │
│ search_vector (tsvector, generated)                   │
└──────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌───────────────────────────────┐
│   item_photos    │  │   item_measurements            │
│─────────────────│  │───────────────────────────────│
│ id (uuid, PK)   │  │ id (uuid, PK)                 │
│ item_id (FK)     │  │ item_id (FK)                  │
│ s3_key           │  │ label (e.g. "Seat Height",    │
│ thumbnail_key    │  │   "Mirror Plate", "Drawer")   │
│ original_filename│  │ height / width / depth        │
│ content_type     │  │ diameter                      │
│ caption          │  │ notes                         │
│ is_primary (bool)│  │ display_order                 │
│ display_order    │  │ created_at                    │
│ width_px         │  └───────────────────────────────┘
│ height_px        │
│ file_size_bytes  │
│ created_at       │
└─────────────────┘

┌─────────────────────────────┐     ┌──────────────────────────────┐
│   vendors                    │     │   acquisitions                │
│─────────────────────────────│     │──────────────────────────────│
│ id (uuid, PK)               │     │ id (uuid, PK)                │
│ user_id (FK → users)        │     │ item_id (FK → items)         │
│ name                        │     │ vendor_id (FK → vendors)     │
│ business_name               │     │ acquisition_date             │
│ type (dealer|auction|private│     │ listed_price (decimal)       │
│   |estate_sale|flea_market  │     │ purchase_price (decimal)     │
│   |gallery|other)           │     │ buyers_premium_pct (decimal) │
│ email                       │     │ tax_amount (decimal)         │
│ phone                       │     │ shipping_cost (decimal)      │
│ website                     │     │ total_cost (decimal, computed)│
│ address (text)              │     │ lot_number                   │
│ specialty (text)            │     │ sale_name                    │
│ notes (text)                │     │ acquisition_type (purchase   │
│ rating (1-5)                │     │   |gift|inheritance|trade)   │
│ created_at                  │     │ receipt_s3_key               │
│ updated_at                  │     │ notes (text)                 │
└─────────────────────────────┘     │ created_at                   │
                                     └──────────────────────────────┘

┌──────────────────────────────┐     ┌──────────────────────────────┐
│   valuations                  │     │   share_tokens                │
│──────────────────────────────│     │──────────────────────────────│
│ id (uuid, PK)                │     │ id (uuid, PK)                │
│ item_id (FK → items)         │     │ user_id (FK → users)         │
│ valuation_type (estimated    │     │ token (unique string)        │
│   |appraised|insured         │     │ scope (item|room|collection) │
│   |auction_estimate|retail)  │     │ scope_id (uuid, polymorphic) │
│ value_low (decimal)          │     │ recipient_email              │
│ value_high (decimal)         │     │ recipient_name               │
│ value_single (decimal)       │     │ expires_at                   │
│ appraiser_name               │     │ include_values (bool)        │
│ appraiser_credentials        │     │ created_at                   │
│ valuation_date               │     │ last_accessed_at             │
│ purpose (insurance|estate    │     └──────────────────────────────┘
│   |sale|donation|personal)   │
│ notes (text)                 │
│ document_s3_key              │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│   ai_analyses                 │
│──────────────────────────────│
│ id (uuid, PK)                │
│ item_id (FK → items)         │
│ analysis_type (identify      │
│   |condition|provenance      │
│   |value_estimate)           │
│ prompt_used (text)           │
│ response (JSONB)             │
│ model_version                │
│ photo_ids (uuid[])           │
│ applied (bool)               │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│   plan_limits (reference)     │
│──────────────────────────────│
│ plan (PK)                    │
│ max_items                    │
│ max_photos_per_item          │
│ max_storage_mb               │
│ max_custom_types             │
│ ai_analyses_per_month        │
│ pdf_exports_per_month        │
│ share_links_enabled (bool)   │
│ batch_pdf_enabled (bool)     │
│ analytics_enabled (bool)     │
│ priority_support (bool)      │
└──────────────────────────────┘

┌──────────────────────────────┐
│   usage_tracking              │
│──────────────────────────────│
│ id (uuid, PK)                │
│ user_id (FK → users)         │
│ period (varchar, "2026-04")  │
│ items_count (integer)        │
│ photos_count (integer)       │
│ storage_bytes (bigint)       │
│ ai_analyses_count (integer)  │
│ pdf_exports_count (integer)  │
│ updated_at                   │
└──────────────────────────────┘
```

### Multi-Tenancy Design

**Tenant Isolation Strategy: Row-Level User Scoping**

Curiolu uses a user-level tenancy model where every data-owning table includes a `user_id` foreign key. This is the simplest multi-tenant pattern for a Postgres-backed SaaS, and it's already baked into the schema above. Key principles:

1. **Every query is tenant-scoped.** A centralized helper function `scopedQuery(userId)` wraps all database reads with a `.where(eq(table.userId, userId))` clause. No query should ever run without tenant scoping — this is enforced by the `requireAuth()` helper which always returns the authenticated user, and all data-access functions require a userId parameter.

2. **S3 namespacing by user.** All object keys include the user ID prefix: `{userId}/items/{itemId}/photos/...`. This means a single S3 bucket safely holds all tenants' files, and you could add per-tenant bucket policies later if needed.

3. **Default item types are per-tenant.** The seed script creates default types with `user_id = null` (system defaults). When a new user registers, these are cloned into their own `user_id`-scoped copies so each user can customize without affecting others.

4. **Share tokens are tenant-scoped.** A share token always belongs to a specific user. Shared views only expose that user's data.

5. **Admin role.** The `admin` plan/role gives you (the app owner) access to a future admin dashboard for managing users, viewing metrics, and troubleshooting. Regular users are `owner` of their own data.

**What this means for the build:** Every server action and query function takes `userId` as a parameter. The auth helpers always inject the current user. There is no "global" data access pattern. This costs almost nothing in development effort but makes multi-tenancy work from day one.

### Feature Flag System (Vercel Flags SDK)

Curiolu uses the **Vercel Flags SDK** (`flags` npm package) — the official, framework-native feature flag library for Next.js. Flags are defined as code in a single file, evaluated server-side only (no client-side layout shift), and integrate with the Vercel Toolbar Flags Explorer for local overrides during development.

**Why Flags SDK over env vars:** Environment variables require a redeploy to change. The Flags SDK evaluates flags per-request, supports the Vercel Toolbar for instant local overrides, and provides a typed API. Most importantly, each flag is a function with a `decide()` callback that can read the user's session, plan, or any other context — so flags can be global kill switches OR user-targeted.

**Flag definitions (`src/flags.ts`):**

```typescript
import { flag } from 'flags/next';
import { getCurrentUser } from '@/lib/auth-helpers';

// Global: is the AI feature set visible to any user?
export const aiEnabled = flag({
  key: 'ai-enabled',
  description: 'Enable AI-powered analysis features (identify, condition, provenance, value estimate)',
  decide: () => false,  // Flip to true when ready to launch AI
});

// Global: is public registration open?
export const registrationOpen = flag({
  key: 'registration-open',
  description: 'Allow new user registration',
  decide: () => false,  // Flip to true when ready for public signups
});

// Global: are subscription limits enforced?
export const subscriptionsEnabled = flag({
  key: 'subscriptions-enabled',
  description: 'Enforce plan limits and show billing UI',
  decide: () => false,  // Flip to true when Stripe is wired up
});

// User-targeted: allow specific users into AI beta
export const aiBetaAccess = flag({
  key: 'ai-beta-access',
  description: 'Grant AI features to specific beta testers before global launch',
  decide: async () => {
    const user = await getCurrentUser();
    if (!user) return false;
    if (user.plan === 'admin') return true;
    // Add beta tester logic here (e.g., check a betaAccess column or email list)
    return false;
  },
});
```

**Usage in Server Components and Server Actions:**
```typescript
// In a Server Component
import { aiEnabled, aiBetaAccess } from '@/flags';

export default async function ItemDetailPage() {
  const showAi = await aiEnabled() || await aiBetaAccess();
  return (
    <Tabs>
      {/* ... other tabs ... */}
      {showAi && <TabsTrigger value="ai">AI Analysis</TabsTrigger>}
    </Tabs>
  );
}
```

**Usage in Client Components** (pass the resolved value down as a prop):
```typescript
// Server Component passes the flag value
const showAi = await aiEnabled() || await aiBetaAccess();
return <AnalysisPanel enabled={showAi} itemId={item.id} />;
```

**Flags Explorer endpoint** (`src/app/.well-known/vercel/flags/route.ts`):
Exposes flags to the Vercel Toolbar so you can toggle them locally during development without changing code. Overrides are stored in an encrypted cookie per browser session.

**Flags managed in this project:**

| Flag Key | Type | Default | Controls |
|----------|------|---------|----------|
| `ai-enabled` | boolean | `false` | Global kill switch for all AI features (analysis panel, AI tab, analyze button) |
| `ai-beta-access` | boolean | per-user | User-targeted AI access before global launch (admin always true) |
| `registration-open` | boolean | `false` | Whether /register page allows new signups |
| `subscriptions-enabled` | boolean | `false` | Whether plan limits are enforced and billing UI is shown |

**Launch sequence:**
1. **Now (build phase):** All flags default `false` except `ai-beta-access` returns `true` for admin. You have full access; nobody else does.
2. **AI soft launch:** Flip `ai-enabled` to `true` for yourself, or add specific beta tester emails to `ai-beta-access`. AI features appear for those users only.
3. **Public launch:** Flip `registration-open` to `true`. New users sign up with `plan='free'`.
4. **Monetization:** Flip `subscriptions-enabled` to `true`. Plan limits are enforced, billing UI appears, Stripe is live.

### Subscription Plans (Built Now, Enforced Later)

The plan system is built into the schema and auth layer but **not enforced in the UI during the initial build**. The `subscriptions-enabled` feature flag controls whether plan limits are checked and whether subscription UI is shown. This means:

- **Phase 1 (now):** You use the app with plan='admin' which has no limits. Registration is closed. The plan_limits table exists but limits aren't enforced.
- **Phase 2 (when ready to launch):** Flip the flag, wire up Stripe, and plan limits start gating features. No schema changes needed.

**Planned tiers:**

| Feature | Free | Pro ($9/mo) | Premium ($19/mo) | Admin |
|---------|------|-------------|-------------------|-------|
| Items | 25 | 250 | Unlimited | Unlimited |
| Photos per item | 3 | 10 | 25 | Unlimited |
| Storage | 500 MB | 5 GB | 25 GB | Unlimited |
| Custom types | 2 | 10 | Unlimited | Unlimited |
| AI analyses/month | 5 | 50 | 200 | Unlimited |
| PDF exports/month | 10 | Unlimited | Unlimited | Unlimited |
| Share links | No | Yes | Yes | Yes |
| Batch PDF | No | Yes | Yes | Yes |
| Analytics dashboard | Basic | Full | Full | Full |
| Priority support | No | No | Yes | Yes |

### Custom Item Type Schema (JSONB)

The `field_schema` column on `collection_item_types` defines per-type fields:

```json
{
  "fields": [
    {
      "key": "seat_height",
      "label": "Seat Height (in)",
      "type": "number",
      "unit": "inches",
      "required": false,
      "group": "Dimensions"
    },
    {
      "key": "upholstery_type",
      "label": "Upholstery Type",
      "type": "select",
      "options": ["Silk", "Velvet", "Needlepoint", "Leather", "Tapestry", "Cotton", "Linen", "None"],
      "required": false,
      "group": "Materials"
    },
    {
      "key": "wood_type",
      "label": "Wood Type",
      "type": "multi_select",
      "options": ["Walnut", "Oak", "Mahogany", "Rosewood", "Fruitwood", "Pine", "Beech", "Gilt", "Lacquered"],
      "required": false,
      "group": "Materials"
    },
    {
      "key": "has_key",
      "label": "Has Key",
      "type": "boolean",
      "required": false,
      "group": "Condition"
    },
    {
      "key": "restoration_history",
      "label": "Restoration History",
      "type": "textarea",
      "required": false,
      "group": "Provenance"
    }
  ],
  "measurement_presets": ["Seat Height", "Arm Height", "Seat Depth"],
  "default_materials": ["Wood"],
  "pdf_sections": ["Dimensions", "Materials", "Condition", "Provenance"]
}
```

**Supported field types:** `text`, `textarea`, `number`, `boolean`, `select`, `multi_select`, `date`, `url`

---

## 6. Application Architecture

### Directory Structure

```
curiolu/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth layout group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── verify-email/         # Email verification (future)
│   │   ├── (dashboard)/              # Authenticated layout group
│   │   │   ├── layout.tsx            # Sidebar + nav
│   │   │   ├── page.tsx              # Dashboard/overview
│   │   │   ├── items/
│   │   │   │   ├── page.tsx          # Collection list (filterable, sortable)
│   │   │   │   ├── new/page.tsx      # New item form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Item detail view
│   │   │   │       ├── edit/page.tsx
│   │   │   │       └── pdf/route.ts  # PDF generation endpoint
│   │   │   ├── types/
│   │   │   │   ├── page.tsx          # Manage custom item types
│   │   │   │   └── [id]/page.tsx     # Edit type schema
│   │   │   ├── vendors/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── rooms/
│   │   │   │   └── page.tsx          # Room-based views
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx          # Value analytics dashboard
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # Profile, preferences
│   │   │   │   └── billing/page.tsx  # Subscription management (future)
│   │   │   └── admin/                # Admin-only routes (your account)
│   │   │       ├── page.tsx          # Admin dashboard
│   │   │       └── users/page.tsx    # User management
│   │   ├── (marketing)/              # Public marketing pages (future)
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── pricing/page.tsx      # Pricing page
│   │   ├── .well-known/
│   │   │   └── vercel/flags/route.ts # Flags Explorer discovery endpoint
│   │   ├── share/[token]/            # Public share routes (no auth)
│   │   │   ├── page.tsx
│   │   │   └── pdf/route.ts
│   │   └── api/
│   │       ├── ai/analyze/route.ts   # AI photo analysis
│   │       ├── upload/route.ts       # Presigned URL generation
│   │       ├── pdf/batch/route.ts    # Batch PDF generation
│   │       └── webhooks/
│   │           └── stripe/route.ts   # Stripe webhook handler (future)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── items/
│   │   │   ├── item-form.tsx         # Dynamic form (base + custom fields)
│   │   │   ├── item-card.tsx
│   │   │   ├── item-gallery.tsx
│   │   │   ├── photo-uploader.tsx
│   │   │   └── measurement-editor.tsx
│   │   ├── vendors/
│   │   ├── analytics/
│   │   │   ├── value-by-room-chart.tsx
│   │   │   ├── value-trend-chart.tsx
│   │   │   └── coverage-gap-card.tsx
│   │   ├── pdf/
│   │   │   ├── catalog-card.tsx      # Christie's-style template
│   │   │   └── insurance-sheet.tsx   # Insurance documentation template
│   │   ├── ai/
│   │   │   └── analysis-panel.tsx    # AI results review + apply
│   │   ├── subscription/
│   │   │   ├── plan-gate.tsx         # Wrapper that checks plan limits
│   │   │   ├── upgrade-prompt.tsx    # "Upgrade to Pro" CTA component
│   │   │   └── usage-meter.tsx       # Visual usage indicator
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema definitions
│   │   ├── migrations/
│   │   └── index.ts                  # Database client
│   ├── lib/
│   │   ├── storage.ts               # S3/Linode Object Storage client
│   │   ├── ai.ts                    # Anthropic API client + prompts
│   │   ├── pdf.ts                   # PDF generation utilities
│   │   ├── validators.ts            # Zod schemas (base + dynamic)
│   │   ├── share.ts                 # Token generation + validation
│   │   ├── plans.ts                 # Plan limits, feature gating helpers
│   │   ├── usage.ts                 # Usage tracking + limit checking
│   │   └── stripe.ts               # Stripe client (future, placeholder)
│   ├── flags.ts                      # Vercel Flags SDK flag definitions
│   └── types/
│       └── index.ts                 # Shared TypeScript types
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env.local
```

### Key Architectural Patterns

**1. Tenant-Scoped Data Access**
Every server action and query function receives `userId` from the authenticated session. A `scopedWhere(userId)` helper ensures all SELECT/UPDATE/DELETE operations include a `.where(eq(table.userId, userId))` clause. No data-access function works without a userId — the TypeScript types enforce this. This is the single most important pattern for multi-tenancy.

**2. Dynamic Form Generation**
The item form reads `field_schema` from the selected `collection_item_type` and renders form fields dynamically using React Hook Form + Zod. Base fields are always present; custom fields render below in collapsible groups.

**3. Presigned Upload Flow**
Photos upload directly from the browser to Linode Object Storage via presigned URLs. The flow: client requests presigned URL → API route generates it → client PUTs directly to S3 → client confirms upload → server stores metadata + triggers thumbnail generation. All S3 keys are namespaced by userId.

**4. PDF Generation**
`@react-pdf/renderer` runs server-side in API routes. The React components (`catalog-card.tsx`, `insurance-sheet.tsx`) receive item data and render pixel-perfect PDFs. Batch mode generates a multi-page document by concatenating item PDFs with page breaks.

**5. AI Analysis Flow**
User clicks "Analyze" on an item → selects photos → API route sends images to Claude vision → structured response parsed → results shown in review panel → user selects which suggestions to apply → fields updated.

**6. Share Tokens**
Owner generates a time-limited token scoped to an item, room, or full collection. Share URL loads a read-only view with optional value visibility. No account creation required for recipients. Tokens are always scoped to the creating user's data.

**7. Feature Flags (Vercel Flags SDK)**
All feature gating uses the Vercel Flags SDK (`flags/next`). Flags are defined in `src/flags.ts` as typed functions with server-side `decide()` callbacks. AI features are gated behind `aiEnabled` (global) and `aiBetaAccess` (per-user). In Server Components, call `const showAi = await aiEnabled()` and conditionally render. In Client Components, pass the resolved boolean as a prop. The Vercel Toolbar Flags Explorer allows local overrides during development without code changes. Flags are never evaluated client-side — no layout shift, no exposed flag logic.

**8. Plan Gating (Subscription Layer)**
A `checkPlanLimit(userId, feature)` helper reads the user's plan and current usage from the database. It returns `{ allowed: boolean, current: number, limit: number, upgradeRequired: string }`. A React wrapper `<PlanGate feature="ai_analysis">` conditionally renders content or shows an upgrade prompt. The entire plan enforcement layer is gated behind the `subscriptionsEnabled` flag — when that flag returns false, all checks return `allowed: true`.

**8. Usage Tracking**
Metered features (AI analyses, PDF exports, photos, storage) increment counters in the `usage_tracking` table. Counters reset monthly. The usage check runs before the action, not after — so users can't exceed limits by racing.

---

## 7. UI Design Direction

### Aesthetic: "Refined Catalog"

Clean, structured, and professional — think a modern auction house's digital catalog system. Restrained color palette anchored by a deep navy-indigo primary, warm parchment backgrounds in light mode, and a sophisticated blue-gray dark mode. Inter as the sole typeface keeps everything unified and contemporary.

### Color System

The app supports both **light mode** and **dark mode** with a toggle. Default is the user's OS preference (`prefers-color-scheme`). Manual selection persists in `localStorage`.

**Core palette:**

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--primary` | `#2E3D6B` rgb(46,61,107) | `#2E3D6B` | Buttons, active states, links, key accents |
| `--primary-light` | `#818AA6` rgb(129,138,166) | `#818AA6` | Hover states, secondary accents, badges |
| `--background` | `#FDF9F2` rgb(253,249,242) | `#181A21` rgb(24,26,33) | Page background |
| `--surface` | `#FFFFFF` | `#20232C` rgb(32,35,44) | Cards, dialogs, dropdowns |
| `--surface-alt` | `#F5F1EA` | `#282B36` | Alternating table rows, subtle sections |
| `--text` | `#1C1E26` | `#E8E6E1` | Primary text |
| `--text-muted` | `#6B6E7B` | `#9B9DA6` | Secondary text, placeholders, captions |
| `--border` | `#E0DDD6` | `#353845` | Card borders, dividers, input borders |
| `--success` | `#4B8C5A` | `#4B8C5A` | Condition "excellent", positive valuations |
| `--warning` | `#BEA03C` | `#BEA03C` | Stale appraisals, items needing attention |
| `--danger` | `#AF504B` | `#AF504B` | Uninsured items, destructive actions, errors |

**Sidebar:** Uses `--primary` (#2E3D6B) as background in both modes, with white/light text.

### Typography

**Inter** (variable font) for everything — headings, body, UI, data fields. Use weight and size variation to create hierarchy, not multiple typefaces.

| Role | Weight | Size | Usage |
|------|--------|------|-------|
| Display / Page titles | Inter 700 (Bold) | 24–28px | Page headers, item titles on detail |
| Section headers | Inter 600 (Semibold) | 16–18px | Card headers, form sections, tab labels |
| Body | Inter 400 (Regular) | 14px | Paragraphs, descriptions, form fields |
| Small / Captions | Inter 400 | 12px | Metadata labels, timestamps, table headers |
| Data / Measurements | Inter 500 (Medium) + tabular-nums | 14px | Dimensions, prices, values (use `font-variant-numeric: tabular-nums`) |

### Component Styling

- **Cards:** `--surface` background, `--border` border (1px), subtle shadow (`0 1px 3px rgba(0,0,0,0.06)`). Rounded corners (8px).
- **Buttons:** Primary = `--primary` bg + white text. Secondary = transparent + `--primary` text + `--border` border. Danger = `--danger` bg + white text.
- **Forms:** Spacious padding, `--border` input borders, `--primary` focus ring. Grouped fieldsets with semibold section headers.
- **Data tables:** Minimal gridlines, alternating `--surface` / `--surface-alt` rows, small caps headers.
- **Detail pages:** Hero photo, structured metadata grid below, provenance as flowing prose.
- **Dark mode transitions:** Use `transition: background-color 0.2s, color 0.2s` on the body for smooth mode switching.

### Dark Mode Implementation

Use `next-themes` for theme management:
- Default: `system` (follows OS preference)
- User toggle persists to `localStorage`
- CSS variables switch via `[data-theme="dark"]` or `.dark` class on `<html>`
- All color references use CSS variables, never hardcoded hex values in components

### Key UI Patterns

- **Collection grid:** Uniform grid of item cards — primary photo, title below, period + room badges, estimated value. 3 cols → 2 → 1 responsive.
- **Item detail:** Full-width hero photo gallery (swipeable) → metadata tabs (Details, Measurements, Provenance, Valuations, Photos, AI Analysis)
- **Quick filters:** Pill-style filter bar — by room, type, period, style, value range
- **Vendor profile:** Card showing dealer info, purchase history timeline, total spend
- **Analytics dashboard:** Value-by-room bar chart, value trend line chart, coverage gap analysis
- **Theme toggle:** Sun/Moon icon in the header, uses `next-themes` `useTheme()` hook

---

## 8. Claude Code Build Prompts

### Sequencing Strategy

The prompts are ordered to build foundational infrastructure first, then progressively add features. Each prompt is designed to be self-contained enough that Claude Code can execute it in a single session while building on the previous work.

---

### Prompt 0: Project Scaffolding

```
Initialize a new Next.js 15 project called "curiolu" with the App Router, TypeScript,
Tailwind CSS 4, and the following configuration:

1. Run `npx create-next-app@latest curiolu` with TypeScript, Tailwind, App Router,
   src/ directory, and import alias @/

2. Install core dependencies:
   - drizzle-orm @neondatabase/serverless (database)
   - drizzle-kit (dev, migrations)
   - @auth/core @auth/drizzle-adapter next-auth@beta (auth)
   - @aws-sdk/client-s3 @aws-sdk/s3-request-presigner (S3/Linode storage)
   - react-hook-form @hookform/resolvers zod (forms + validation)
   - @tanstack/react-table (data tables)
   - recharts (charts)
   - @react-pdf/renderer (PDF generation)
   - @anthropic-ai/sdk (AI)
   - sharp (image processing)
   - nanoid (token generation)
   - date-fns (date formatting)
   - lucide-react (icons)
   - class-variance-authority clsx tailwind-merge (styling utilities)
   - zustand (client state)
   - @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities (drag and drop)
   - bcryptjs @types/bcryptjs (password hashing)
   - flags (Vercel Flags SDK for feature flags)
   - next-themes (dark/light mode management)

3. Initialize shadcn/ui:
   - Run `npx shadcn@latest init` with New York style, neutral base color, CSS variables
   - Add components: button, input, textarea, select, label, card, dialog, dropdown-menu,
     tabs, badge, separator, skeleton, toast, tooltip, table, checkbox, switch,
     command, popover, calendar, sheet, accordion, avatar, scroll-area

4. Create the project structure as specified in the architecture document. Create
   placeholder files for all directories under src/app, src/components, src/db, src/lib,
   and src/types.

5. Set up environment variables template (.env.example):
   - DATABASE_URL (Neon/Vercel Postgres connection string)
   - AUTH_SECRET
   - LINODE_ACCESS_KEY, LINODE_SECRET_KEY, LINODE_ENDPOINT, LINODE_BUCKET
   - ANTHROPIC_API_KEY
   - NEXT_PUBLIC_APP_URL
   - FLAGS_SECRET (32-char base64 string for Vercel Flags SDK encrypted overrides)
   - STRIPE_SECRET_KEY (placeholder, not needed until subscriptions launch)
   - STRIPE_WEBHOOK_SECRET (placeholder)

6. Configure Drizzle (drizzle.config.ts) pointing at DATABASE_URL with the
   postgres-js driver for Neon serverless.

7. Set up a cn() utility function in src/lib/utils.ts combining clsx + tailwind-merge.

8. Configure Tailwind with CSS variables for the dual-theme color system:
   - Define colors as CSS custom properties in globals.css, switching with .dark class:
     --primary: #2E3D6B (both modes)
     --primary-light: #818AA6 (both modes)
     --background: #FDF9F2 (light) / #181A21 (dark)
     --surface: #FFFFFF (light) / #20232C (dark)
     --surface-alt: #F5F1EA (light) / #282B36 (dark)
     --text: #1C1E26 (light) / #E8E6E1 (dark)
     --text-muted: #6B6E7B (light) / #9B9DA6 (dark)
     --border: #E0DDD6 (light) / #353845 (dark)
     --success: #4B8C5A, --warning: #BEA03C, --danger: #AF504B (both modes)
   - Map these CSS variables to Tailwind theme colors in tailwind.config.ts
   - Set darkMode: 'class' for next-themes compatibility
   - Font family: Inter only (via CSS variable from next/font/google)

9. Set up next-themes in the root layout:
   - Install next-themes, wrap app in ThemeProvider with attribute="class"
     defaultTheme="system" enableSystem storageKey="curiolu-theme"
   - Import Inter from next/font/google as variable font
   - Set Inter as the body font via className on html element
   - Apply background and text colors via CSS variables on body

Do not create any application logic yet — just the clean scaffolding with all
dependencies installed, configured, and verified to compile with `pnpm build`.
```

---

### Prompt 1: Database Schema & Migrations

```
Working in the curiolu project, create the complete Drizzle ORM database schema
and generate the initial migration.

Create src/db/schema.ts with the following tables. Use UUIDs for all primary keys
(use crypto.randomUUID as default). Use Drizzle's pgTable, pgEnum, and relations helpers.

ENUMS:
- userRole: 'owner' | 'admin'
- userPlan: 'free' | 'pro' | 'premium' | 'admin'
- itemCondition: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
- itemStatus: 'active' | 'sold' | 'gifted' | 'stored' | 'on_loan'
- vendorType: 'dealer' | 'auction_house' | 'private' | 'estate_sale' | 'flea_market' | 'gallery' | 'other'
- acquisitionType: 'purchase' | 'gift' | 'inheritance' | 'trade'
- valuationType: 'estimated' | 'appraised' | 'insured' | 'auction_estimate' | 'retail'
- valuationPurpose: 'insurance' | 'estate' | 'sale' | 'donation' | 'personal'
- shareScope: 'item' | 'room' | 'collection'
- aiAnalysisType: 'identify' | 'condition' | 'provenance' | 'value_estimate'
- fieldType: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multi_select' | 'date' | 'url'

TABLES:
1. users — id, email (unique), name, password_hash, role (userRole default 'owner'), plan (userPlan default 'free'), stripe_customer_id (varchar nullable), stripe_subscription_id (varchar nullable), plan_valid_until (timestamp nullable), is_active (boolean default true), created_at, updated_at
2. collection_item_types — id, user_id (FK nullable — null means system default), name, slug, description, icon, field_schema (jsonb), display_order (integer), is_default (boolean), created_at, updated_at
3. collection_items — id, user_id (FK), item_type_id (FK), title, description (text), period, style, origin_country, origin_region, maker_attribution, materials (text array), condition (itemCondition), condition_notes (text), height (numeric 10,2), width (numeric 10,2), depth (numeric 10,2), diameter (numeric 10,2), weight (numeric 10,2), room, position_in_room, custom_fields (jsonb), provenance_narrative (text), provenance_references (text), notes (text), tags (text array), status (itemStatus default 'active'), created_at, updated_at
4. item_photos — id, item_id (FK), s3_key, thumbnail_key, original_filename, content_type, caption, is_primary (boolean default false), display_order (integer), width_px (integer), height_px (integer), file_size_bytes (integer), created_at
5. item_measurements — id, item_id (FK), label, height (numeric 10,2), width (numeric 10,2), depth (numeric 10,2), diameter (numeric 10,2), notes, display_order (integer), created_at
6. vendors — id, user_id (FK), name, business_name, type (vendorType), email, phone, website, address (text), specialty (text), notes (text), rating (integer), created_at, updated_at
7. acquisitions — id, item_id (FK), vendor_id (FK nullable), acquisition_date (date), listed_price (numeric 10,2), purchase_price (numeric 10,2), buyers_premium_pct (numeric 5,2), tax_amount (numeric 10,2), shipping_cost (numeric 10,2), total_cost (numeric 10,2), lot_number, sale_name, acquisition_type (acquisitionType), receipt_s3_key, notes (text), created_at
8. valuations — id, item_id (FK), valuation_type (valuationType), value_low (numeric 12,2), value_high (numeric 12,2), value_single (numeric 12,2), appraiser_name, appraiser_credentials, valuation_date (date), purpose (valuationPurpose), notes (text), document_s3_key, created_at
9. share_tokens — id, user_id (FK), token (varchar 21 unique), scope (shareScope), scope_id (varchar), recipient_email, recipient_name, expires_at (timestamp), include_values (boolean default false), created_at, last_accessed_at (timestamp)
10. ai_analyses — id, item_id (FK), analysis_type (aiAnalysisType), prompt_used (text), response (jsonb), model_version, photo_ids (text array), applied (boolean default false), created_at
11. plan_limits — plan (userPlan, PK), max_items (integer), max_photos_per_item (integer), max_storage_mb (integer), max_custom_types (integer), ai_analyses_per_month (integer), pdf_exports_per_month (integer), share_links_enabled (boolean), batch_pdf_enabled (boolean), analytics_enabled (boolean), priority_support (boolean)
12. usage_tracking — id, user_id (FK), period (varchar 7, e.g. "2026-04"), items_count (integer default 0), photos_count (integer default 0), storage_bytes (bigint default 0), ai_analyses_count (integer default 0), pdf_exports_count (integer default 0), updated_at. Add unique constraint on (user_id, period).

Define all relations using Drizzle's relations() helper.

Add indexes:
- users: email (unique)
- collection_items: user_id, item_type_id, room, status
- collection_item_types: user_id
- item_photos: item_id + display_order
- acquisitions: item_id, vendor_id
- valuations: item_id + valuation_date
- share_tokens: token (unique)
- vendors: user_id
- usage_tracking: (user_id, period) unique

Create src/db/index.ts that exports a singleton Drizzle client using @neondatabase/serverless
Pool constructor reading DATABASE_URL.

Create TypeScript types in src/types/index.ts:
- Export inferred types from schema (InferSelectModel, InferInsertModel for each table)
- Create a FieldDefinition type: { key, label, type (fieldType), unit?, options?, required, group, min?, max? }
- Create a FieldSchema type: { fields: FieldDefinition[], measurement_presets?: string[], default_materials?: string[], pdf_sections?: string[] }
- Create a CustomFieldValues type: Record<string, string | number | boolean | string[] | null>
- Create a PlanFeature type: 'items' | 'photos' | 'storage' | 'custom_types' | 'ai_analyses' | 'pdf_exports' | 'share_links' | 'batch_pdf' | 'analytics'
- Create a PlanCheckResult type: { allowed: boolean, current: number, limit: number, plan: string }

Generate the migration with `npx drizzle-kit generate`.

Create src/db/seed.ts that inserts default collection item types with appropriate field_schema:
- Furniture (fields: wood_type multi_select, upholstery_type select, joinery_type select, hardware_type select, has_key boolean, has_original_finish boolean, restoration_history textarea)
- Porcelain & Ceramics (fields: factory_mark text, pattern_name text, glaze_type select, firing_type select, base_mark_description textarea)
- Textiles (fields: fiber_content multi_select, weave_type select, thread_count number, colorfast boolean)
- Rugs & Carpets (fields: knot_type select, knots_per_inch number, pile_material select, foundation_material select, selvedge_condition select)
- Silver & Metalwork (fields: hallmarks text, silver_standard select, maker_mark text, weight_troy_oz number, monogram text)
- Paintings & Prints (fields: medium multi_select, support select, frame_period text, signed boolean, signature_location text, print_technique select, edition text)
- Glass (fields: technique multi_select, pontil_type select, color_description text)
- Lighting (fields: fixture_type select, electrified boolean, original_fuel_type select, shade_material select, shade_included boolean)
- Clocks & Watches (fields: movement_type select, movement_maker text, case_material select, dial_type select, runs boolean)
- Books & Manuscripts (fields: binding_type select, edition text, publisher text, print_year number, plates_count number, condition_specifics textarea)

Include sensible select options for each field. Make the seed script runnable via `npx tsx src/db/seed.ts`.

The seed script should also:
- Insert default types with user_id = null (system defaults, cloned per-user on registration)
- Populate the plan_limits table:
  • free: 25 items, 3 photos/item, 500 MB storage, 2 custom types, 5 AI/month, 10 PDF/month, no shares, no batch, basic analytics
  • pro: 250 items, 10 photos/item, 5 GB, 10 custom types, 50 AI/month, unlimited PDF, shares yes, batch yes, full analytics
  • premium: unlimited items, 25 photos/item, 25 GB, unlimited types, 200 AI/month, unlimited PDF, all features
  • admin: unlimited everything
```

---

### Prompt 2: Authentication System

```
Working in the curiolu project, implement the authentication system using
NextAuth.js v5 (Auth.js) with the Drizzle adapter, designed for multi-tenant SaaS.

1. Configure NextAuth in src/auth.ts:
   - Use the Drizzle adapter connected to the existing schema
   - Credentials provider for email/password
   - JWT strategy for sessions
   - Extend the session type to include: user id, role, plan, is_active
   - Configure pages: signIn → '/login'
   - On sign-in callback: check user.is_active, reject if false

2. Create auth middleware (src/middleware.ts):
   - Protect all routes under (dashboard) — redirect to /login if unauthenticated
   - Protect /admin/* routes — redirect to /dashboard if user.role !== 'admin'
   - Allow /share/[token] routes without auth
   - Allow /api/webhooks/* without auth (for Stripe webhooks later)
   - Allow /login, /register, and (marketing) routes without auth

3. Build the auth pages in src/app/(auth)/:
   - /login page: email + password form, centered card on --background
   - App name "Curiolu" in Inter Bold as the visual logo, primary color
   - Primary-colored submit button, --border input borders
   - Error display for invalid credentials
   - "Don't have an account? Sign up" link to /register

4. Registration (src/app/(auth)/register/page.tsx):
   - Open registration — any user can create an account
   - Fields: name, email, password, confirm password
   - Creates user with role='owner', plan='free'
   - On registration, clone all system-default item types (user_id=null)
     into the new user's account (user_id=newUser.id)
   - Create initial usage_tracking record for the current period
   - Redirect to /dashboard after registration
   - IMPORTANT: Gate registration behind the `registrationOpen` feature flag
     from src/flags.ts. When the flag returns false, show a friendly
     "Registration is currently closed — join the waitlist" page with email input.
     Import and await the flag at the top of the Server Component:
     `const isOpen = await registrationOpen();`

5. Create server-side auth helpers (src/lib/auth-helpers.ts):
   - getCurrentUser() — returns typed user from session or null
   - requireAuth() — returns user or redirects to /login
   - requireAdmin() — returns user if role=admin, else throws 403
   - getUserPlan(userId) — returns the user's current plan details

6. Create plan gating helpers (src/lib/plans.ts):
   - getPlanLimits(plan) — reads plan_limits table for the given plan
   - checkPlanLimit(userId, feature: PlanFeature) — compares current usage
     against plan limits. Returns PlanCheckResult.
   - Import the `subscriptionsEnabled` flag from src/flags.ts.
     If `await subscriptionsEnabled()` returns false, always return { allowed: true }
   - incrementUsage(userId, feature) — bumps the usage counter for the
     current period in usage_tracking table
   - getCurrentUsage(userId) — returns current period's usage_tracking record
   - getOrCreateUsagePeriod(userId) — ensures a usage_tracking record exists
     for the current month (format: "YYYY-MM")

7. Create plan gate components (src/components/subscription/):
   - <PlanGate feature="ai_analysis"> — wraps content that requires a plan check.
     If allowed: renders children. If not: renders <UpgradePrompt>.
     If subscriptions flag disabled: always renders children.
   - <UpgradePrompt feature="ai_analysis" /> — friendly "Upgrade to Pro to unlock..."
     card with feature description and CTA button (links to /settings/billing).
     Styled warmly — not aggressive.
   - <UsageMeter feature="ai_analysis" /> — shows "5 of 50 analyses used this month"
     as a subtle progress bar. Only visible when subscriptions flag is enabled.

8. Create feature flag definitions (src/flags.ts):
   Define all feature flags using the Vercel Flags SDK (`flags/next`):
   - `aiEnabled` — global kill switch for AI features, default false
   - `aiBetaAccess` — user-targeted AI access (returns true for admin plan), default false
   - `registrationOpen` — controls /register page visibility, default false
   - `subscriptionsEnabled` — controls plan limit enforcement + billing UI, default false

   Create the Flags Explorer discovery endpoint:
   src/app/.well-known/vercel/flags/route.ts
   - Import all flags from src/flags.ts
   - Export GET handler using `createFlagsDiscoveryEndpoint` and `getProviderData`
   - This allows the Vercel Toolbar to discover and override flags locally

   FLAGS_SECRET env var is required for the encrypted override cookie.
   Generate one at https://generate-secret.vercel.app/32

8. Password hashing with bcryptjs — hash on create, verify on login.

9. First admin user: The seed script or a CLI command should create the admin user:
   `pnpm tsx src/db/create-admin.ts --email=kevin@example.com --password=...`
   This creates a user with role='admin', plan='admin'. Run this once after
   initial deployment. All subsequent users register through the /register page.

Keep the auth pages minimal and elegant. --background page, --surface card,
Inter font, --primary button. Must work in both light and dark modes.
```

---

### Prompt 3: Layout & Navigation Shell

```
Working in the curiolu project, build the authenticated application shell —
sidebar navigation, header, and dashboard overview.

1. Dashboard layout (src/app/(dashboard)/layout.tsx):
   - Left sidebar (260px fixed on desktop) + main scrollable content area
   - Mobile: sidebar collapses to off-canvas Sheet with hamburger trigger
   - Main area: max-width 1400px container, centered, with comfortable padding

2. Sidebar (src/components/layout/sidebar.tsx):
   - "Curiolu" in Inter Bold at top (text-xl, white color on primary background)
   - Navigation links with Lucide icons, each with an item count badge where relevant:
     • Dashboard (LayoutDashboard)
     • Collection (Package) — total item count badge
     • Item Types (Shapes)
     • Vendors (Store) — vendor count
     • Rooms (Home)
     • Analytics (TrendingUp)
     • Settings (Settings)
     • Admin (Shield) — only visible if user.role === 'admin'
   - Active state: white/light left border accent + white/10 background overlay
   - Hover: subtle white/5 background transition
   - Bottom section: user name + plan badge, sign out button
   - Sidebar background: var(--primary) (#2E3D6B), text: white/light

3. Header (src/components/layout/header.tsx):
   - Breadcrumb trail (Home / Collection / Item Name)
   - Global search: Cmd+K to open command palette
   - "Add Item" primary action button (--primary color)
   - Mobile: hamburger menu + simplified header

4. Dashboard page (src/app/(dashboard)/page.tsx):
   - Welcome heading with user name
   - 4 stat cards in a row: Total Items, Estimated Collection Value,
     Items Needing Appraisal (no valuation in last 3 years), Items Without Photos
   - Recent additions: grid of last 6 items as cards with primary photo thumbnail,
     title, period, room badge
   - Quick actions section: Add Item, Add Vendor, Generate Inventory Report
   - Use Server Components — query counts and recent items server-side

5. Command palette (src/components/layout/command-palette.tsx):
   - shadcn Command component triggered by Cmd+K
   - Sections: Navigation (all pages), Quick Actions (add item, add vendor),
     Recent Items (search as you type)
   - Search hits items by title using a simple ILIKE query for now
     (full-text search comes in Prompt 12)

Style: primary-colored sidebar, --background main area. Stat cards as
--surface cards with subtle shadow. Inter Bold for headings, Inter Regular for body.
Include a theme toggle (Sun/Moon icon) in the header using next-themes useTheme().
```

---

### Prompt 4: Custom Item Types Management

```
Working in the curiolu project, build the collection item types management UI —
defining and editing custom field schemas that drive the dynamic item forms.

1. Types list page (src/app/(dashboard)/types/page.tsx):
   - Grid of type cards: icon, name, description, field count, item count using that type
   - "Create Custom Type" button
   - Default types (is_default=true) can be edited but not deleted
   - Server Component querying types with item counts via a left join

2. Type detail/editor page (src/app/(dashboard)/types/[id]/page.tsx):
   - Name, slug (auto-generated from name, editable), description, icon picker
   - The field_schema builder is the core feature here

3. Field Schema Builder (src/components/types/field-schema-builder.tsx):
   Interactive drag-and-drop editor for the field_schema JSONB:

   - Sortable field list using dnd-kit. Each field row shows:
     drag handle | field label | type badge (color-coded) | group name | required indicator | edit/delete
   - "Add Field" button opens a dialog:
     • Label (required)
     • Key (auto-generated from label as snake_case, editable)
     • Type dropdown: text, textarea, number, boolean, select, multi_select, date, url
     • Group (text input with autocomplete from existing groups in this schema)
     • Required toggle
     • Conditional sections based on type:
       - select/multi_select: options list editor — add/remove/reorder option strings
       - number: optional unit label, min, max
   - Measurement Presets section: list of preset measurement labels (e.g. "Seat Height",
     "Arm Height") that will pre-populate the measurements editor when creating items
   - Default Materials: tag list of materials pre-filled for new items of this type
   - Live preview panel: shows how custom fields will render as a form (read-only mockup)

4. Zod validators (src/lib/validators.ts):
   - fieldDefinitionSchema — validates a single field definition
   - fieldSchemaSchema — validates the full field_schema object
   - generateDynamicSchema(fieldSchema: FieldSchema) — takes a FieldSchema and returns
     a Zod object schema that validates custom_fields values at runtime:
     • text/textarea/url → z.string()
     • number → z.number() with optional min/max
     • boolean → z.boolean()
     • select → z.enum(options)
     • multi_select → z.array(z.enum(options))
     • date → z.string().date()
     • All fields optional unless required=true

5. Server actions (src/app/(dashboard)/types/actions.ts):
   - createItemType(data) — validate + insert
   - updateItemType(id, data) — validate + update, including field_schema
   - deleteItemType(id) — only if no items reference this type, else return error
   - reorderTypes(orderedIds) — bulk update display_order

Schema changes are additive-safe: removing a field from field_schema doesn't delete
existing custom_fields JSONB data — the field simply stops rendering in forms.
```

---

### Prompt 5: Collection Items — CRUD & Dynamic Forms

```
Working in the curiolu project, build collection items CRUD with the dynamic
form system driven by custom item type schemas.

1. Items list page (src/app/(dashboard)/items/page.tsx):
   - Server Component that fetches items with primary photo, latest valuation, type name
   - Client-side TanStack Table with columns:
     Photo (thumbnail) | Title | Type | Period | Room | Condition | Est. Value | Added
   - All columns sortable
   - Filter bar above table:
     • Item type dropdown (from collection_item_types)
     • Room dropdown (from distinct room values)
     • Condition multi-select
     • Status filter (pills)
     • Value range slider (min/max)
     • Text search input
   - View toggle: table view ↔ card grid view
   - Card grid: uniform cards — primary photo, title below, period + room badges,
     estimated value. 3 columns desktop, 2 tablet, 1 mobile.
   - Pagination: cursor-based, 24 per page

2. Item form component (src/components/items/item-form.tsx):
   This is the most important component in the app. It combines base fields
   with dynamically rendered custom fields from the type schema.

   Uses React Hook Form with a Zod schema composed of:
   - Base schema (always present): title (required), description, period, style,
     origin_country, origin_region, maker_attribution, materials (string array),
     condition, condition_notes, room, position_in_room, status, height, width,
     depth, diameter, weight, provenance_narrative, provenance_references, notes, tags
   - Dynamic schema: generated from the selected type's field_schema using
     generateDynamicSchema() from validators.ts

   Form layout:
   Section 1 — Core Identity:
     Title (full width), Description (textarea, full width)
     Type selector (dropdown — when changed, rebuilds custom fields section)
     Period, Style, Origin Country, Origin Region (2-column grid)
     Maker/Attribution (full width)

   Section 2 — Materials & Condition:
     Materials (tag input: type + Enter to add, click to remove)
     Condition (select) + Condition Notes (textarea)

   Section 3 — Overall Dimensions:
     Height, Width, Depth in a row (number inputs with "in." suffix label)
     Diameter, Weight in a row

   Section 4 — Custom Fields (dynamic):
     Renders from field_schema.fields, grouped by "group" property
     Each group is a collapsible Accordion section with serif header
     Field rendering by type:
       text → Input
       textarea → Textarea
       number → Input type=number with unit suffix
       boolean → Switch
       select → Select dropdown
       multi_select → multi-checkbox group or combobox
       date → Calendar date picker
       url → Input with external link icon
     Values stored in form as nested object under "custom_fields" key

   Section 5 — Location:
     Room (combobox: select existing or type new), Position in Room

   Section 6 — Provenance:
     Provenance Narrative (large textarea)
     Provenance References (textarea)

   Section 7 — Notes & Tags:
     Notes (textarea), Tags (tag input)

   Section 8 — Status:
     Status select

   Use collapsible sections so the form isn't overwhelming. All sections open
   by default on create, collapsed (except Core Identity) on edit.

3. New item page (src/app/(dashboard)/items/new/page.tsx):
   - If query param ?type=<id>, pre-select that type
   - On save → redirect to item detail page

4. Item detail page (src/app/(dashboard)/items/[id]/page.tsx):
   Server Component that fetches item with all relations.

   Layout:
   - Hero: primary photo (large), thumbnail strip below (max 6, +N more indicator)
   - Title (Inter, large), subtitle: Period · Style · Origin
   - Attribution line if present
   - Action bar: Edit, PDF (dropdown: Catalog / Insurance), Share, Delete

   Tabbed content (shadcn Tabs):
   - Details tab: structured read-only display of all base + custom fields
     in a clean 2-column metadata grid. Custom fields grouped by group name.
   - Measurements tab: table of component measurements (added in next prompt
     as measurement-editor, but show placeholder here)
   - Provenance tab: narrative as flowing prose, references below
   - Acquisition tab: purchase details card (vendor link, prices, costs) —
     placeholder for now, built in Prompt 7
   - Valuations tab: timeline of valuations — placeholder, built in Prompt 8
   - Photos tab: full gallery — placeholder, built in Prompt 6
   - AI Analysis tab: placeholder, built in Prompt 10

5. Edit page (src/app/(dashboard)/items/[id]/edit/page.tsx):
   - Same item-form in edit mode, pre-populated with existing data
   - Save redirects back to detail page

6. Server actions (src/app/(dashboard)/items/actions.ts):
   - createItem(formData) — validate base + custom fields against type schema,
     insert item, return new id
   - updateItem(id, formData) — validate + update
   - deleteItem(id) — cascade delete photos (including S3 cleanup), measurements,
     acquisitions, valuations, ai_analyses. Confirm dialog in UI before calling.
   - getItems(filters) — filtered, sorted, paginated query

7. Measurement editor (src/components/items/measurement-editor.tsx):
   - Inline editable table on the Measurements tab
   - Pre-populated with measurement_presets from the item's type schema
   - Columns: Label | Height | Width | Depth | Diameter | Notes | Actions
   - Add row button for custom measurements
   - Save individual rows via server action
   - Drag to reorder

Keep forms spacious and clean. Inter Semibold section headers,
--border input borders, --primary save button, secondary cancel button.
All colors via CSS variables so dark mode works automatically.
```

---

### Prompt 6: Photo Management & S3 Integration

```
Working in the curiolu project, build the photo management system with
Linode Object Storage (S3-compatible) integration.

1. S3 client (src/lib/storage.ts):
   - Configure AWS SDK v3 S3Client for Linode Object Storage using env vars:
     LINODE_ENDPOINT, LINODE_ACCESS_KEY, LINODE_SECRET_KEY, LINODE_BUCKET
   - generatePresignedUploadUrl(key, contentType) — PUT presigned URL, 15 min expiry
   - generatePresignedDownloadUrl(key) — GET presigned URL, 1 hour expiry
   - deleteObject(key) — delete single object
   - deleteObjects(keys) — batch delete
   - Key convention: {userId}/items/{itemId}/photos/{photoId}/{filename}
   - Thumbnail key: {userId}/items/{itemId}/photos/{photoId}/thumb_{filename}

2. Upload API route (src/app/api/upload/route.ts):
   - POST: body { itemId, filename, contentType, fileSize }
   - Auth-protected (owner only)
   - Validates file type (jpeg, png, webp, heic) and size (< 20MB)
   - Returns { presignedUrl, key, thumbnailKey, photoId }

3. Upload confirmation API (src/app/api/upload/confirm/route.ts):
   - POST: body { photoId, key, thumbnailKey, itemId, originalFilename, contentType,
     widthPx, heightPx, fileSizeBytes }
   - Creates item_photos record
   - Triggers thumbnail generation (see below)

4. Thumbnail generation (src/lib/image-processing.ts):
   - processUploadedPhoto(key, thumbnailKey): fetches original from S3,
     uses sharp to resize to 400px wide (maintain aspect ratio), JPEG 80%,
     uploads thumbnail to S3 at thumbnailKey
   - Extract width_px, height_px from original
   - Called server-side after upload confirmation
   - Handle HEIC conversion (sharp supports it)

5. Photo uploader component (src/components/items/photo-uploader.tsx):
   - Drag-and-drop zone + file picker button
   - Accepts multiple files
   - Upload flow per file:
     a. Show preview from local File object immediately
     b. Request presigned URL from /api/upload
     c. PUT file directly to S3 presigned URL
     d. On success, POST to /api/upload/confirm
     e. Show completion state with thumbnail from S3
   - Progress bar per file during upload
   - Error state with retry button
   - After all uploads complete:
     - Star icon to mark primary photo (only one, toggleable)
     - Caption input per photo (inline edit, auto-save)
     - Drag to reorder (dnd-kit sortable)
     - Delete button with confirmation

6. Photo gallery component (src/components/items/item-gallery.tsx):
   - Shown on item detail page (both hero area and Photos tab)
   - Hero: primary photo displayed large (max 600px tall)
   - Thumbnail strip below hero: horizontally scrollable
   - Click thumbnail → swaps hero image
   - Click hero → opens lightbox overlay:
     - Full-resolution image
     - Prev/Next navigation
     - Caption overlay
     - Close on Escape or click outside
   - Photos tab shows full grid of all photos with captions

7. Integrate into item detail page:
   - Hero + thumbnail strip in the top section
   - Photos tab shows uploader (owner) or read-only gallery (viewer/share)

8. Integrate into item form:
   - Photo uploader section in the form (after saving item, since we need itemId)
   - For new items: show message "Save item first, then add photos"
   - For edit: show uploader with existing photos

Handle errors gracefully — toast on upload failure, retry on network issues.
Show a placeholder image for items with no photos.
```

---

### Prompt 7: Vendor Management & Acquisitions

```
Working in the curiolu project, build the vendor/dealer management feature
and the acquisition tracking system.

1. Vendors list page (src/app/(dashboard)/vendors/page.tsx):
   - Server Component: query vendors with item counts and total spend (via acquisitions)
   - Card grid: vendor name, business name, type badge (color-coded by vendorType),
     specialty text, item count, total spend formatted as currency
   - Search input (filters by name/business_name)
   - Filter by vendor type
   - "Add Vendor" button

2. Vendor form (src/components/vendors/vendor-form.tsx):
   - Fields: Name, Business Name, Type (select), Email, Phone, Website, Address (textarea),
     Specialty, Notes (textarea)
   - Rating: 1-5 star selector (clickable stars using Lucide Star icons)
   - React Hook Form + Zod validation (name required, email format if provided)

3. Vendor detail page (src/app/(dashboard)/vendors/[id]/page.tsx):
   - Header card: vendor info with all contact details, type badge, star rating
   - Website as external link, email as mailto link
   - Stats row: Total Items Purchased | Total Spend | Average Discount | Active Since
   - Purchase History section:
     Chronological list (newest first) of acquisitions from this vendor.
     Each entry: item primary photo thumbnail, item title (link), acquisition date,
     purchase price, listed price (if different, show as struck-through), sale name,
     lot number
   - "Add Item from this Vendor" quick action button (links to new item with vendor pre-selected)

4. Vendor server actions (src/app/(dashboard)/vendors/actions.ts):
   - createVendor, updateVendor
   - deleteVendor — only if no acquisitions reference this vendor, else error
   - getVendorWithPurchaseHistory(id)
   - searchVendors(query) — for the vendor selector combobox

5. Acquisition form (src/components/items/acquisition-form.tsx):
   This lives on the item detail page's Acquisition tab.

   - Vendor selector: searchable combobox querying vendors
   - "Add New Vendor" button inside the selector (opens vendor form in a dialog,
     creates vendor inline, then selects it — no page navigation)
   - Fields:
     • Acquisition Date (calendar picker)
     • Acquisition Type (select: purchase/gift/inheritance/trade)
     • Listed Price, Purchase Price (currency inputs with $ prefix)
     • Buyer's Premium % (number input, auto-calculates amount)
     • Tax Amount, Shipping Cost (currency inputs)
     • Total Cost: auto-calculated = purchase_price + (purchase_price * premium/100) + tax + shipping
       Display as a computed read-only field, also stored in DB
     • Lot Number, Sale Name
     • Notes (textarea)
     • Receipt upload (single file, uses same presigned URL flow as photos)
   - An item can have multiple acquisitions (representing ownership chain)

6. Acquisition display on item detail page:
   - Acquisition tab shows the most recent acquisition prominently as a card
   - Vendor name links to vendor detail page
   - Cost breakdown table: Listed → Purchase → Premium → Tax → Shipping → Total
   - Earlier acquisitions (if any) shown as a collapsed timeline below
   - Receipt download link if uploaded

7. Acquisition server actions:
   - createAcquisition(itemId, data)
   - updateAcquisition(id, data)
   - deleteAcquisition(id)
```

---

### Prompt 8: Valuations & Analytics Dashboard

```
Working in the curiolu project, build the valuation tracking system and the
analytics dashboard.

1. Valuation form (src/components/items/valuation-form.tsx):
   - Shown on item detail page's Valuations tab
   - "Add Valuation" button opens inline form:
     • Valuation Type (select from valuationType enum)
     • Value Range: Low / High (currency inputs) OR Single Value (currency input)
       Toggle between range and single value mode
     • Appraiser Name, Appraiser Credentials
     • Valuation Date (calendar picker, defaults to today)
     • Purpose (select from valuationPurpose enum)
     • Notes (textarea)
     • Document upload (appraisal PDF, same S3 presigned flow)
   - Valuations are append-only — add new entries, don't edit old ones
   - Each valuation entry shows in a timeline, most recent first

2. Valuation display on item detail page (Valuations tab):
   - Latest valuation highlighted in a prominent card at top:
     "Current Estimated Value: $8,000 – $10,000" (or single value)
     Type badge, appraiser name, date
   - Historical timeline below: date | type | value | appraiser | purpose
   - Document download links for attached appraisal reports
   - Visual: small bar showing value range for each entry

3. Valuation server actions:
   - createValuation(itemId, data) — validate + insert
   - getValuationHistory(itemId) — ordered by date desc
   - getLatestValuation(itemId, type?) — most recent, optionally by type

4. Analytics query functions (src/lib/queries/analytics.ts):
   All queries use database aggregations, not client-side computation.
   - getCollectionSummary(userId) → { totalItems, totalEstimatedValue,
     totalAcquisitionCost, appreciation }
   - getValueByRoom(userId) → [{ room, totalValue, itemCount }]
   - getValueOverTime(userId, granularity) → [{ period, estimated, insured, cost }]
   - getCoverageGaps(userId) → [{ itemId, title, estimatedValue, insuredValue,
     lastInsuredDate, gapAmount, status: 'underinsured'|'uninsured'|'stale' }]
   - getCompositionByField(userId, field) → [{ value, count, totalValue }]
     for type, period, room, condition
   - getTopItemsByValue(userId, limit) → items with latest valuation
   - getSpendingOverTime(userId) → [{ period, totalSpend, itemCount }]
   - getVendorAnalysis(userId) → [{ vendor, spend, itemCount, avgDiscount }]

5. Analytics dashboard (src/app/(dashboard)/analytics/page.tsx):
   Server Component that fetches all analytics data in parallel.

   Layout:
   a. Summary row — 4 stat cards:
      Total Items | Total Estimated Value | Total Acquisition Cost | Appreciation %

   b. Value by Room — horizontal bar chart (Recharts BarChart):
      Each room's total estimated value, sorted descending
      --primary bars, --border gridlines
      Click bar → navigate to room view

   c. Value Trend — line chart (Recharts LineChart):
      Lines: Estimated Value (--primary), Insured Value (--primary-light), Acquisition Cost (--text-muted)
      Toggle: Monthly / Quarterly / Yearly
      X-axis: dates, Y-axis: dollar values

   d. Insurance Coverage Gaps — table + summary card:
      Card: "X items underinsured by $Y total"
      Table: Item | Estimated | Insured | Gap | Last Appraised | Status badge
      Status badges: red (uninsured), orange (underinsured), yellow (stale >3 years)

   e. Collection Composition — 2x2 grid of donut charts:
      By Type | By Period | By Room | By Condition
      Use primary, primary-light, success, warning, danger for chart segments

   f. Top 10 Items — horizontal bar chart, item titles on Y-axis

   g. Spending Over Time — bar chart by month/year, --primary-light bars

   h. Vendor Analysis — table: Vendor | Items | Total Spend | Avg Discount | Last Purchase

   All charts: --background, color palette: --primary, --primary-light, --success, --warning, --danger,
   Inter labels, subtle --border gridlines.

6. Rooms page (src/app/(dashboard)/rooms/page.tsx):
   - Grid of room cards:
     Room name, item count, total estimated value, mini photo grid (up to 4 thumbnails)
   - Click → room detail: filtered item grid for that room
   - "Generate Room Inventory PDF" button on room detail (calls batch PDF endpoint)
   - Rooms are derived from distinct room values on items (no separate rooms table)
```

---

### Prompt 9: PDF Generation — Catalog Card & Insurance Sheet

```
Working in the curiolu project, build the PDF generation system using
@react-pdf/renderer with two templates.

1. PDF utilities (src/lib/pdf.ts):
   - fetchItemForPdf(itemId) — fetches item with all relations: photos (with
     presigned download URLs), measurements, latest acquisition, all valuations,
     type with field_schema (to render custom field labels properly)
   - imageUrlToBase64(url) — fetches image from presigned S3 URL, returns base64
     data URI for embedding in PDF
   - Register fonts: embed Inter variable font (regular, medium, semibold, bold) using
     @react-pdf/renderer Font.register with
     Google Fonts URLs
   - formatDimensions(item) — returns formatted string like "H 42 × W 36 × D 18 in."
   - formatCurrency(amount) — returns "$12,500" format
   - formatDateShort(date) — returns "Mar 2024" format

2. Catalog Card Template (src/components/pdf/catalog-card.tsx):
   A @react-pdf/renderer Document component. Design like a Christie's lot sheet.

   Single page, US Letter (8.5 × 11"), margins: 0.75" all sides.

   Top section:
   - "Curiolu" wordmark: Inter italic, 10pt, primary-light color, top-left
   - Reference: "Ref. OLU-{shortId}" top-right, Inter 8pt, --text-muted

   Photo section (~40% of page):
   - Primary photo, centered, max height 3.5", maintain aspect ratio
   - Thin hairline border in warm gray around photo
   - 0.5" space below photo

   Title block:
   - Item title: Inter bold, 18pt, centered, --text color
   - Subtitle: Period · Style · Origin — Inter italic, 11pt, centered, --text-muted color
   - Attribution line (if present): Inter italic, 10pt, centered
   - Thin primary-colored (#2E3D6B) horizontal rule (0.5pt)

   Metadata grid (2-column):
   Left column:
   - "Materials:" label (Inter bold 9pt) + value (Inter 9pt)
   - "Dimensions:" + formatted dimensions
   - "Condition:" + condition value
   - "Location:" + room / position
   Right column:
   - Custom fields from the type schema, rendered dynamically
   - Only show fields that have values (skip nulls/empties)
   - Use field labels from the type's field_schema

   Provenance section:
   - "Provenance" header: Inter italic, 11pt
   - Narrative text: Inter 9pt, italic, justified
   - Truncate if too long to fit page (max ~8 lines)

   Thin primary-colored rule

   Valuation footer:
   - Latest estimated value: "Estimated Value: $8,000 – $10,000"
     Inter bold, 10pt, right-aligned
   - Appraisal date if available

   Page footer:
   - "Confidential — Prepared {date}" centered, Inter 7pt, --text-muted

3. Insurance Documentation Sheet (src/components/pdf/insurance-sheet.tsx):
   Practical, comprehensive, utilitarian design for insurance purposes.

   Single page, US Letter, margins: 0.6" all sides.

   Header band:
   - "COLLECTION ITEM — INSURANCE DOCUMENTATION" Inter bold 12pt, caps
   - Reference number + date prepared, right-aligned

   Two-column top section (60/40 split):
   Left column (60%):
   - Primary photo, max height 2.5"
   - Below: up to 4 additional photos in a 2×2 grid, each ~1.2" wide

   Right column (40%):
   - Item title (Inter bold 11pt)
   - Type, Period, Style, Origin — labeled rows
   - Condition + condition notes
   - Materials list

   Full-width sections below:

   Dimensions table:
   - Header row: Component | H | W | D | Diam | Notes
   - First row: "Overall" with item dimensions
   - Additional rows from item_measurements
   - Inter 8pt, alternating row backgrounds

   Acquisition Details:
   - Vendor, Date, Purchase Price, Total Cost, Sale/Lot
   - Single row layout

   Valuation History table:
   - Date | Type | Value/Range | Appraiser | Purpose
   - All valuations, most recent first

   CURRENT INSURED VALUE (highlighted box):
   - --warning background box
   - Latest insured valuation value, large bold text
   - Or "NO CURRENT INSURANCE VALUATION" in red if none exists

   Provenance summary:
   - First 3 lines of provenance narrative, truncated with "..."

   Footer:
   - Owner name, preparation date

4. Single-item PDF route (src/app/(dashboard)/items/[id]/pdf/route.ts):
   - GET with query param ?template=catalog|insurance
   - Fetches item data, converts photos to base64
   - Renders PDF with @react-pdf/renderer renderToBuffer
   - Returns with headers:
     Content-Type: application/pdf
     Content-Disposition: inline; filename="curiolu-{title}-{template}.pdf"

5. Batch PDF route (src/app/api/pdf/batch/route.ts):
   - POST body: { itemIds?: string[], room?: string, template: 'catalog'|'insurance' }
   - If room provided, fetches all items in that room
   - Generates a multi-page PDF:
     Cover page: "Room Inventory: {room}" or "Collection Inventory"
       Item count, total estimated value, date prepared
     Then one page per item using the selected template
   - Returns the combined PDF

6. Integrate into UI:
   - Item detail page: "Generate PDF" dropdown button with Catalog Card / Insurance Sheet options
     Opens PDF in new browser tab
   - Room detail: "Generate Room Inventory" button with template selector
   - Items list: bulk select → "Generate PDF for Selected" with template selector

Handle edge cases:
- Items without photos: show a subtle placeholder rectangle with "No photo available"
- Long provenance text: truncate gracefully
- Missing values: show "—" rather than empty space
- Very long titles: reduce font size or truncate
```

---

### Prompt 10: AI Analysis Integration

```
Working in the curiolu project, build the AI-powered analysis feature using
the Anthropic SDK with Claude's vision capabilities.

IMPORTANT: All AI features must be gated behind the `aiEnabled` and `aiBetaAccess`
feature flags from src/flags.ts. The AI tab, analyze buttons, and API routes
should only be accessible when `await aiEnabled() || await aiBetaAccess()` returns
true. When flags return false:
- The "AI Analysis" tab should not appear on the item detail page
- The /api/ai/analyze route should return 403 with { error: "AI features not enabled" }
- The bulk "Analyze Selected" action should not appear on the items list
This ensures AI features are fully built and functional but invisible until launch.

1. AI client (src/lib/ai.ts):
   - Initialize Anthropic client from @anthropic-ai/sdk
   - Define structured prompts for each analysis type.
   - All prompts instruct Claude to respond in JSON format only.

   IDENTIFY prompt — style/period identification:
   "You are an expert appraiser and art historian specializing in antiques and
   decorative arts. Analyze these photos and provide identification. Consider
   construction techniques, decorative elements, proportions, and materials visible.
   Respond ONLY as JSON: { period: string, dateRange: string, style: string,
   origin: { country: string, region?: string }, materials: string[],
   makerAttribution: string|null, confidence: 'low'|'medium'|'high',
   comparables: [{ description: string, institution?: string }],
   notes: string }"

   CONDITION prompt:
   "You are a conservator assessing condition. Examine these photos for damage,
   wear, repairs, and restoration evidence. Respond ONLY as JSON:
   { rating: 'excellent'|'very_good'|'good'|'fair'|'poor',
   issues: [{ area: string, description: string, severity: 'minor'|'moderate'|'significant' }],
   restorations: [{ area: string, description: string, quality: string }],
   recommendations: string[], overallNotes: string }"

   PROVENANCE prompt:
   "You are an art historian. Given the item details and photos, draft a provenance
   narrative suitable for an auction catalog. Use formal art historical language.
   Note any visible marks, labels, stamps, or inscriptions. Respond ONLY as JSON:
   { narrative: string, identifiedMarks: [{ type: string, description: string,
   location: string }], suggestedResearch: string[] }"

   VALUE_ESTIMATE prompt:
   "You are an antiques appraiser. Based on these details and photos, provide an
   informal market value estimate. This is not a formal appraisal.
   Respond ONLY as JSON: { estimatedRange: { low: number, high: number },
   currency: 'USD', basis: string,
   comparablesSold: [{ description: string, price: number, venue?: string, date?: string }],
   marketNotes: string, confidence: 'low'|'medium'|'high' }"

   - analyzeItem(analysisType, itemData, photoBase64s) — builds the message
     with text context (item title, period, style, existing data) + image content
     blocks, calls Claude, parses JSON response, returns typed result

2. AI API route (src/app/api/ai/analyze/route.ts):
   - POST body: { itemId, photoIds, analysisType }
   - Auth-protected (owner only)
   - Fetch item data + selected photos (download from S3, convert to base64)
   - Call analyzeItem with appropriate prompt
   - Parse response (strip markdown fences if present, JSON.parse)
   - Store in ai_analyses table: analysis_type, prompt_used, response (JSONB),
     model_version, photo_ids, applied=false
   - Return the analysis result

3. Analysis panel (src/components/ai/analysis-panel.tsx):
   Shown in the AI Analysis tab on item detail page.

   Top section — trigger analysis:
   - "Run Analysis" button with type selector dropdown
   - Photo selector: grid of item photo thumbnails with checkboxes
     (select which photos to send — default: primary photo selected)
   - Subtle note: "AI analysis uses Claude API credits" in muted text
   - Loading state: animated shimmer with "Analyzing..." text

   Results section (after analysis completes):
   Render based on analysis type:

   IDENTIFY results:
   - Card with suggested Period, Style, Origin, Materials, Attribution
   - Confidence badge (color-coded: green/yellow/red)
   - Each field has a side-by-side: "Current: [value]" → "Suggested: [value]"
   - "Apply" button per field (--warning highlight when AI value differs from current)
   - "Apply All" button to apply all suggestions at once
   - Comparables listed below

   CONDITION results:
   - Overall rating with color indicator
   - Issues list: area, description, severity badge
   - Restorations noted
   - Recommendations as a checklist
   - "Apply Rating" button to set item condition

   PROVENANCE results:
   - Generated narrative displayed as formatted prose
   - Identified marks listed with descriptions
   - Suggested research directions
   - "Use as Provenance Narrative" button

   VALUE_ESTIMATE results:
   - Estimated range prominently displayed
   - Basis explanation
   - Comparable sales table
   - Market notes
   - "Save as Estimated Valuation" button → creates a valuation record

   Analysis history:
   - Below the trigger section, list previous analyses:
     Date | Type | Confidence | Applied (yes/no) | "View" button
   - Click "View" shows that analysis result in the results section

4. Apply workflow:
   When user clicks any "Apply" button:
   - Update the item fields via updateItem server action
   - Mark the ai_analysis record as applied=true
   - Show toast: "AI suggestion applied"
   - Refresh the item detail view

5. Error handling:
   - API errors: show friendly message "Analysis failed — please try again"
   - Rate limit: "Please wait a moment before running another analysis"
   - Malformed response: "Could not parse AI response — try again"
   - Timeout: 60 second timeout with cancel button
```

---

### Prompt 11: Share System

```
Working in the curiolu project, build the share token system for giving
read-only access to appraisers, insurers, and other recipients.

1. Share utilities (src/lib/share.ts):
   - generateShareToken() — nanoid(21) for URL-safe tokens
   - validateShareToken(token) — check exists, not expired, return scope data
   - getSharedData(token) — based on scope, fetch the right data:
     • item scope: single item with photos, measurements, valuations (if include_values)
     • room scope: all items in the room
     • collection scope: all items
   - Values (acquisition costs, valuations) only included if include_values=true

2. Share management UI on item detail page:
   "Share" button in the action bar → opens dialog (src/components/share/share-dialog.tsx):
   - Scope indicator: "Sharing: {item title}"
   - Include values toggle (default off) with explanation:
     "When enabled, recipient can see purchase prices and valuations"
   - Expiration selector: 7 days | 30 days | 90 days | No expiration
   - Recipient name (optional) + email (optional) — for your tracking only
   - "Generate Link" button → creates token, shows copyable URL
   - Copy button with "Copied!" confirmation

3. Share management on rooms page:
   "Share Room" button → same dialog, scoped to room

4. Share management in settings:
   Active Shares section:
   - Table: Scope | Item/Room Name | Recipient | Created | Expires | Last Viewed | Actions
   - "Revoke" button per share with confirmation
   - "Share Entire Collection" button with same dialog, collection scope

5. Shared view routes (src/app/share/[token]/):
   No auth required. Minimal branded layout.

   layout.tsx:
   - Clean header: "Curiolu" wordmark (Inter) + "Shared by {owner name}"
   - Expiration notice if token expires within 7 days
   - No sidebar, no editing controls
   - --background + --surface styling, same clean aesthetic

   page.tsx:
   - Validates token (if invalid/expired → friendly error page)
   - Based on scope:

     Item scope: renders item detail view in read-only mode
     - Photo gallery (hero + thumbnails + lightbox)
     - All metadata tabs except AI Analysis
     - Valuations tab only if include_values is true
     - Acquisition tab only if include_values is true
     - "Generate PDF" button available (catalog or insurance)

     Room scope: grid of item cards for the room
     - Click card → item detail within shared view
     - "Generate Room Inventory PDF" button

     Collection scope: full filterable grid (like main collection view)
     - All items browsable
     - Room filter available

   pdf/route.ts:
   - Same PDF generation but accessed via share token validation
   - Respects include_values setting (hides values in PDF if not included)

6. Server actions:
   - createShareToken(scope, scopeId, options) — insert token
   - revokeShareToken(tokenId) — delete token
   - getActiveShares(userId) — list all active (non-expired) tokens
   - Touch last_accessed_at on each shared view access

7. Expired/invalid token page:
   - Friendly message: "This shared link has expired or is no longer available."
   - "Contact the collection owner for a new link."
   - Clean, minimal design
```

---

### Prompt 12: Search, Polish & Performance

```
Working in the curiolu project, implement full-text search, add polish
and loading states throughout, and optimize performance.

1. Full-text search:
   - Add a database trigger or Drizzle hook that updates the search_vector
     tsvector column on collection_items whenever the item is inserted/updated.
     Concatenate: title (weight A), description (weight B), period, style,
     origin_country, maker_attribution (weight B), provenance_narrative (weight C),
     materials array joined, tags array joined, notes (weight D),
     and all text values from custom_fields JSONB (weight C).
   - Create GIN index on search_vector
   - Search query function: fullTextSearch(userId, query, limit, offset)
     Uses plainto_tsquery, returns items ranked by ts_rank
   - Highlight matching snippets using ts_headline

   Integrate search:
   - Command palette (Cmd+K): live search as you type (debounced 300ms)
     Show results grouped: Items (with snippets), then navigation links
   - Items list page: the text search input uses full-text search
     Results show highlighted matching text

2. UI polish — loading states:
   - Skeleton components for:
     • Item card (photo placeholder + text lines)
     • Item detail page (photo skeleton + metadata skeletons)
     • Table rows
     • Analytics chart placeholders
     • Vendor cards
   - Use React Suspense boundaries with skeleton fallbacks on all server components
   - Loading.tsx files in each route directory for page-level transitions

3. UI polish — empty states:
   - Items list (no items): illustration area + "Add your first piece" CTA
   - Vendors (no vendors): "Add your first dealer or auction house" CTA
   - Analytics (insufficient data): "Add more items and valuations to see insights"
   - Valuations tab (no valuations): "Record your first valuation"
   - Photos tab (no photos): "Upload photos of this piece"
   - Each empty state: --text-muted colored text, relevant icon, action button

4. UI polish — interactions:
   - Toast notifications for all mutations (shadcn toast):
     Success: "Item saved", "Photo uploaded", "Valuation recorded"
     Error: "Failed to save — please try again"
     Info: "PDF generating..."
   - Confirmation dialogs for all destructive actions (delete item, revoke share)
   - Optimistic updates where appropriate (photo reorder, star primary)

5. Keyboard shortcuts:
   - Cmd+K: command palette
   - Cmd+N: new item (when on items/dashboard page)
   - Escape: close modals, lightbox, command palette
   - Arrow keys: navigate photo gallery
   - Register shortcuts via a useKeyboardShortcuts hook

6. Responsive design audit:
   - Sidebar: hidden on mobile, Sheet overlay on hamburger click
   - Items grid: 3 cols → 2 cols → 1 col
   - Item detail: photo + metadata stack vertically on mobile
   - Forms: single column on mobile, 2-column grid on desktop
   - Analytics charts: full width on mobile, 2-col grid on desktop
   - Tables: horizontal scroll on mobile with sticky first column
   - PDF buttons: full width on mobile

7. Performance:
   - All list pages: cursor-based pagination (24 items per page)
   - Analytics charts: lazy loaded via dynamic(() => import(...), { ssr: false })
     with skeleton fallbacks
   - Images: next/image everywhere with blur placeholder from thumbnail
   - Database: verify all filtered queries hit indexes.
     Add composite indexes if needed after testing.
   - Search input: 300ms debounce
   - Photo gallery: lazy load off-screen images

8. Data export (in Settings page):
   - "Export Collection as CSV" button:
     Flattens all items (base + custom fields) to CSV, includes latest valuation
   - "Export Collection as JSON" button:
     Full hierarchical export: items → photos, measurements, acquisitions, valuations
   - "Export for Insurance" button:
     CSV with columns: Item, Type, Room, Condition, Insured Value, Last Appraised,
     Appraiser, Photos Count

9. Settings page (src/app/(dashboard)/settings/page.tsx):
   - Profile section: name, email, change password
   - Preferences:
     • Default measurement unit (inches/cm) — stored in user record or localStorage
     • Items per page (12/24/48)
   - Subscription section (only visible when `subscriptionsEnabled` flag returns true):
     • Current plan badge
     • Usage meters for metered features (items, photos, storage, AI, PDFs)
     • "Manage Subscription" button (links to /settings/billing, placeholder page)
   - Active shares management (from Prompt 11)
   - Data export section (above)
   - Danger zone: "Delete Account & All Data" with double confirmation
     (deletes user, all items, photos from S3, vendors, everything)

Final visual pass: ensure consistent spacing, font usage, color application
across all pages. Verify the brand aesthetic is cohesive in both light and dark modes end to end.
```

---

## 9. Future Enhancements (Post-MVP)

### SaaS Launch (when ready to open to the public)
- **Stripe integration** — wire up `src/lib/stripe.ts` with Stripe Checkout for Pro/Premium plans, handle subscription lifecycle via `/api/webhooks/stripe` (subscription created, updated, canceled, payment failed), update user.plan and plan_valid_until accordingly
- **Billing settings page** — `/settings/billing` showing current plan, usage meters, upgrade/downgrade buttons, payment history, cancel subscription
- **Landing page + pricing** — marketing pages at `(marketing)/page.tsx` and `(marketing)/pricing/page.tsx` showcasing features and plan comparison
- **Admin dashboard** — `/admin` page showing user count, MRR, storage usage, signups over time; `/admin/users` for user management (change plans, deactivate accounts, impersonate for support)
- **Email verification** — verify email on registration before activating account
- **Password reset flow** — "Forgot password" with email-based reset tokens
- **Onboarding flow** — guided first-item creation wizard for new signups
- **Usage alerts** — email notifications when approaching plan limits (80%, 100%)
- **Waitlist** — collect emails when `REGISTRATION_OPEN=false`, notify when launched

### Feature Enhancements
- **Mobile app** (React Native or Capacitor) for in-situ photography
- **QR code labels** — generate and print labels, scan to pull up item detail
- **Insurance schedule generator** — formal multi-page schedule with cover letter
- **Auction result tracking** — link items to comparable sales for market data
- **Map view** — item origins on a world map visualization
- **Timeline view** — items arranged by period on a visual timeline
- **Public gallery mode** — curated portfolio view for sharing the collection publicly
- **Multi-property support** — separate collections per location
- **Import from spreadsheet** — bulk item import from CSV/Excel
- **Change history** — audit log of all field changes per item
- **Team accounts** — multiple users per collection (for dealers, galleries, museums)

---

## 10. Development Timeline Estimate

| Phase | Prompts | Sessions | Description |
|-------|---------|----------|-------------|
| Foundation | 0–2 | 3–4 | Scaffolding, schema, auth |
| Core App | 3–5 | 4–5 | Layout, types, items CRUD |
| Media & Vendors | 6–7 | 3–4 | Photos, S3, vendor management |
| Advanced Features | 8–10 | 4–5 | Analytics, PDFs, AI |
| Sharing & Polish | 11–12 | 3–4 | Share system, search, polish |
| **Total** | **13 prompts** | **~18–22 sessions** | |

Each "session" is roughly one focused Claude Code interaction. Some prompts
may need splitting across sessions. Plan for testing and debugging sessions
between major phases. The items CRUD (Prompt 5) and PDF generation (Prompt 9)
are the densest prompts and most likely to need follow-up iterations.
