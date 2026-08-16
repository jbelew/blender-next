# Blender Next: Git-Backed Visual Layout Engine

Blender Next is a Git-backed visual layout engine for **Next.js 16 (Turbopack)**, **React 19**, and monorepos. 

Instead of syncing schemas between database dashboards and front-end code, Blender Next uses Zod schemas as the source of truth and stores layouts as flat JSON files in Git.

---

## The XML/XSLT modernization analogy

The architecture of Blender Next is a modern take on the classic XML + DTD + XSLT publishing pattern from the early 2000s. The name is a tribute to **Blender**, the custom XML-based publishing engine I built for enterprise storefronts at both **Organic** and **Macys.com**:

| Historic Pattern (XML Stack) | Modern Translation (Blender Next Stack) | Purpose / Role |
| :--- | :--- | :--- |
| **XML Document** (`page.xml`) | **JSON / MDX File** (`home.json`) | The structured layout tree. |
| **DTD / XSD** (`schema.dtd`) | **Zod Schema** (`blender.ts`) | The schema contract enforcing layout validity. |
| **XSLT stylesheet** (`layout.xsl`) | **React Server Components (JSX)** | The engine compiling data into HTML. |
| **Subversion (SVN) / CVS** | **Git (GitHub / GitLab)** | The version control and rollback storage. |

### Why this works today:
*   **Unified language**: Zod schemas, React components, and layout managers are all written in TypeScript. There is no translation layer or schema drift.
*   **Instant compile times**: Bun and Turbopack compile layout transformations instantly, which makes real-time preview rendering possible.
*   **Simple browser bridge**: HTML5 data attributes and `postMessage` loops sync changes from preview frames to the editor sidebar without complex wrappers.

---

## Monorepo structure

Blender Next isolates packages from the storefront implementation using workspaces:

```text
blender-next/
├── apps/
│   └── storefront/             # Next.js 16 Storefront (Turbopack, React 19)
│       ├── src/app/
│       │   ├── [slug]/page.tsx # Dynamic layout route (RSC, async params)
│       │   ├── admin/page.tsx  # Iframe preview page & sidebar editor
│       │   └── api/blender/    # CRUD endpoints (Save, Create, Delete)
│       └── next.config.js
├── packages/
│   ├── core/                   # Schema parsers & filesystem loaders
│   └── react/                  # Preview hooks & iframe postMessage listeners
├── content/
│   └── pages/                  # Git-backed JSON layout files
├── package.json                # Bun workspace configuration
└── README.md
```

---

## Documentation

*   [**Technical architecture specification**](./docs/architecture_specification.md): Specifications for dynamic component maps, code-splitting registries, and global CSS theme variables.
*   [**Engineering roadmap**](./docs/roadmap.md): Architectural roadmap tracking completed security patches and future implementation milestones.
*   [**Git-backed campaign workflows**](./docs/git_campaign_workflows.md): Managing campaigns using Git branches and Pull Requests.
*   [**Scale viability (Git vs. DB)**](./docs/git_scaling_viability.md): Scale analysis on why Git is a proof of concept for localized marketplaces and how to transition to Server-Driven UI (SDUI) databases.
*   [**Scaling strategy (1,000s of pages)**](./docs/scaling_strategy.md): Local SQLite caching, Next.js ISR pre-rendering, and paginated APIs.
*   [**Block cardinality and constraints**](./docs/block_cardinality_and_constraints.md): Enforcing template slots and quantity limits using Zod validation.
*   [**Architectural drawbacks and trade-offs**](./docs/architectural_drawbacks.md): Write scalability, security implications of code/content co-location, and local history size bloat.
*   [**Enterprise database scaling**](./docs/enterprise_database_strategy.md): Migration pathways to PlanetScale, PostgreSQL JSONB, or MongoDB Atlas.
*   [**Design system strategy (Why Shadcn?)**](./docs/design_system_strategy.md): Architectural benefits of using local component files over pre-compiled packages.

---

## CMS vs. Marketplace boundaries

To scale storefronts safely, we enforce a strict separation of concerns:
*   **Marketplace Core / Menu Service (PIM)**: Localized transactional microservices handle delivery dispatch, order tracking, real-time coordinates routing, and merchant operating hours. The Menu Service acts as the Master Data Management (MDM) database for restaurant catalogs, menu specifications, and pricing.
*   **Blender Next**: Manages only the layout skeleton of localized landing pages, restaurant categories, and editorial promotions (e.g. configuring promo banners and placing merchant category identifiers).

At request time, Server Components combine the page structure with live localized menu queries, rendering a single optimized page.

---

## Quick start

### Prerequisites
*   [Bun](https://bun.sh) (v1.1 or later)

### Installation
Run the following commands in your terminal:
```bash
# Install workspace dependencies
bun install
```

### Start the dev server
Navigate to the storefront directory and launch the Turbopack development server:
```bash
cd apps/storefront
bun run dev
```

1.  Open [http://localhost:3000](http://localhost:3000) in your browser.
2.  You will be automatically redirected to the visual dashboard (`/admin`).
3.  Choose a page (e.g. `/home` or `/about`) from the sidebar.
4.  **Real-Time Sync**: Edit block contents in the sidebar. Fields and layout structures update and sync instantly in the preview frame.
5.  **Block Management**: Use the reorder buttons (▲/▼) to swap blocks, click ✕ to delete a block, or append new component blocks instantly.
6.  Click **Save to Disk / Git** to serialize layout structures directly back to Git JSON flat-files.
