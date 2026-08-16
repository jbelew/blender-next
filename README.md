# Blender Next: Git-Backed Visual Layout Engine

Blender Next is a lightweight, Git-backed headless visual layout engine built specifically for **Next.js 16 (Turbopack)**, **React 19**, and **E-commerce Monorepos**. 

Instead of duplicating schemas in a database and a codebase, Blender Next uses **Zod schemas** as the single source of truth and stores page layouts as raw JSON files directly in Git.

---

## 🏛️ The XML/XSLT Modernization Analogy

Though not the intent, it quickly became evidant that the architecture of **Blender Next** is a modern realization of the classic XML + DTD + XSLT publishing pattern from the early 2000s. The name is a tribute to **Blender**, the custom XML-based publishing engine I originally architected and deployed for large-scale enterprise storefronts at both **Organic** and **Macys.com**:

| Historic Pattern (XML Stack) | Modern Translation (Blender Next Stack) | Purpose / Role |
| :--- | :--- | :--- |
| **XML Document** (`page.xml`) | **JSON / MDX File** (`home.json`) | The structured content tree database. |
| **DTD / XSD** (`schema.dtd`) | **Zod Schema** (`blender.ts`) | The schema contract ensuring layout security. |
| **XSLT stylesheet** (`layout.xsl`) | **React Server Components (JSX)** | The transformation engine compiling data into HTML. |
| **Subversion (SVN) / CVS** | **Git (GitHub / GitLab)** | The version control and rollback storage. |

### Why this works today when XML/XSLT failed:
*   **Unified Language (TypeScript)**: The schema (Zod), the transformer (JSX/React), and the layout manager are written in the same language. There is zero translation layer, zero mapping drift, and you write standard React components instead of verbose XSLT nodes.
*   **Sub-Millisecond Compile Times**: Bun and Next.js Turbopack compile layout transformations instantly, yielding instant preview rendering.
*   **The HTML5 Bridge**: Clean data attributes combined with standard `postMessage` loops make syncing changes from previews to parent editor state straightforward and transparent.

---

## 📦 Monorepo Workspace Structure

Blender Next is structured as a decoupled monorepo workspace to keep layouts, schemas, and storefronts isolated:

```text
blender-next/
├── apps/
│   └── storefront/             # Next.js 16 Storefront (Turbopack, React 19)
│       ├── src/app/
│       │   ├── [slug]/page.tsx # Dynamic layout renderer (RSC, async params)
│       │   ├── admin/page.tsx  # Visual iframe dashboard & block editor
│       │   └── api/blender/    # Page CRUD endpoint (Save, Create, Delete)
│       └── next.config.js
├── packages/
│   ├── core/                   # Schema builders, Zod validators, filesystem handlers
│   └── react/                  # useBlender preview hooks & editor bindings
├── content/
│   └── pages/                  # Git-backed JSON layout files (content database)
├── package.json                # Bun workspace configuration
└── README.md
```

---

## 📖 Architecture & Design Documentation

*   [**Technical Architecture Specification**](./docs/architecture_specification.md): Complete specifications for dynamic component maps, code-splitting registries, and global CSS theme variables.
*   [**Git-Backed Campaign Workflows**](./docs/git_campaign_workflows.md): Design vision for mapping campaigns to Git branches and reviews to Pull Requests.
*   [**Scaling Strategy (1,000s of Pages)**](./docs/scaling_strategy.md): Describes local SQLite cache databases, Next.js ISR pre-rendering limits, and paginated infinite-scroll APIs.
*   [**Block Cardinality & Constraints**](./docs/block_cardinality_and_constraints.md): Enforcing rigid template slots and quantity/positional limits via Zod refinement.
*   [**Architectural Drawbacks & Trade-offs**](./docs/architectural_drawbacks.md): Objective review of write scalability, security implications of code/content co-location, and local history size bloat.
*   [**Enterprise Database Scaling**](./docs/enterprise_database_strategy.md): Migration pathways to PlanetScale, PostgreSQL JSONB, or MongoDB Atlas at scale.
*   [**Design System Strategy (Why Shadcn?)**](./docs/design_system_strategy.md): Architectural benefits of choosing copied component codebases over compiled library packages.

---

## 🛍️ Separating the Content Mesh: CMS vs. PIM Boundaries

To scale storefronts safely, Blender Next enforces a strict boundary:
*   **PIM (Product Information Manager)**: dedicated systems (Shopify, Medusa, etc.) handle dynamic, transaction-driven states (prices, inventory, reviews, carts).
*   **Blender Next**: Manages only the **editorial layout skeleton** (e.g. Hero banners, promo copy, and category grids above or below product cards).

At request time, Next.js Server Components load the editorial skeleton from Git, query the PIM for live catalog data based on IDs saved in the layout blocks, and render a single optimized page.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
*   [Bun](https://bun.sh) (v1.1 or later)

### Installation
Run the following commands in your terminal:
```bash
# Clone the repository and install workspace dependencies
bun install
```

### Launch the Storefront & Dashboard
Navigate to the storefront directory and launch the Turbopack development server:
```bash
cd apps/storefront
bun run dev
```

1.  Open [http://localhost:3000](http://localhost:3000) in your browser.
2.  You will be automatically redirected to the visual dashboard (`/admin`).
3.  Choose a page (e.g., `/home` or `/about`) from the sidebar.
4.  **Real-Time Sync**: Edit block contents in the sidebar. Fields and layout structures update and sync instantly in the preview frame.
5.  **Block Management**: Use the reorder buttons (▲/▼) to swap blocks, click ✕ to delete a block, or append new component blocks instantly.
6.  Click **Save to Disk / Git** to serialize layout structures directly back to Git JSON flat-files!
