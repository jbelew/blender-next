# Blender Next: Technical Architecture Specification

This document outlines the technical architecture, design decisions, and schema validation specifications for **Blender Next**—a Git-backed, headless layout engine custom-engineered for **Next.js 16 (App Router)**, **React 19**, and **E-commerce Monorepos**.

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Monorepo Workspace Blueprint](#2-monorepo-workspace-blueprint)
3. [Data Bindings & Iframe Event Bridge](#3-data-bindings--iframe-event-bridge)
4. [Co-located Block Schemas (Zod)](#4-co-located-block-schemas-zod)
5. [Page Templates & Discriminated Schema Unions](#5-page-templates--discriminated-schema-unions)
6. [Dynamic Component Registry Map & Code-Splitting](#6-dynamic-component-registry-map--code-splitting)
7. [CSS Custom Property Theme System](#7-css-custom-property-theme-system)
8. [The CMS vs. PIM Boundary (E-commerce)](#8-the-cms-vs-pim-boundary-e-commerce)
9. [Next.js 16 & React 19 Considerations](#9-next-js-16--react-19-considerations)

---

## 1. Core Philosophy & Architecture

Traditional database-driven Headless CMS platforms introduce structural developer friction (e.g., maintaining schemas in both database tables and UI code) and pollute the client-side DOM with wrapping alignment divs that break CSS flexbox, grids, and absolute positioning relationships.

**Blender Next** solves these issues through:
*   **Git as the Single Source of Truth**: Layout states are represented as clean flat-file JSON blocks in Git, allowing developers and editors to leverage standard versioning, rollbacks, and code-review PR branching.
*   **Code-First Schema Co-location**: Schemas are declared right next to the JSX elements using **Zod**, keeping content rules in sync with component code changes.
*   **DOM Layout Preservation**: Clean data-attribute annotations (`data-blender-field`) map storefront components directly to schema properties without injecting wrapping helper divs, protecting styling grids.
*   **Next.js Server Component Native**: Generates statically optimized routes for storefront visitors, removing CMS parser bundle weight from client-side bundles.

---

## 2. Monorepo Workspace Blueprint

Blender Next uses workspaces to decouple parsing engines and storefront runtimes:

```text
blender-next/
├── apps/
│   └── storefront/                 # Next.js 16 Storefront (Turbopack, React 19)
│       ├── src/
│       │   ├── app/
│       │   │   ├── [slug]/page.tsx # Dynamic loader (SSR/ISR, async params)
│       │   │   ├── admin/page.tsx  # Houses visual editor frame & editing sidebar
│       │   │   └── globals.css     # Global CSS Variable Design System
│       │   ├── components/         # Co-located Page Builder Blocks
│       │   │   ├── Hero/
│       │   │   │   └── Hero.tsx    # JSX layout + co-located HeroSchema
│       │   │   ├── Text/
│       │   │   │   └── Text.tsx    # JSX layout + co-located TextSchema
│       │   │   └── ProductGrid/
│       │   │       └── ProductGrid.tsx # JSX layout + co-located ProductGridSchema
│       │   ├── templates/          # Structural Page Shell Layouts
│       │   │   ├── LandingTemplate/# Full-width page layout template
│       │   │   └── BlogTemplate/   # Split sidebar page layout template
│       │   ├── schemas/
│       │   │   └── page.ts         # Composes master discriminated schema union
│       │   └── blender.ts          # Entrypoint collection registrar
├── packages/
│   ├── core/                       # File loaders, schema parsers, SQLite cache engines
│   └── react/                      # useBlender preview hooks & event bridge
├── content/
│   └── pages/                      # Flat-file layout database
│       ├── home.json
│       └── about.json
└── package.json
```

---

## 3. Data Bindings & Iframe Event Bridge

Visual editing layouts require mapping rendered HTML nodes directly to parent layout configurations. Blender Next establishes a clean, decoupled bridge using:

### A. Element Binding Attributes
Storefront elements are annotated with descriptive data-path selectors using a unified `bind()` utility helper:
```tsx
<h2 {...bind(`blocks.${index}.data.title`)}>
  {title}
</h2>
```
This resolves to a clean DOM property: `data-blender-field="blocks.0.data.title"`. 

### B. DOM Layout Preservation
By forwarding these target keys as custom attributes rather than wrapping JSX elements in framework container helper `div` elements, the storefront's native CSS flexbox, flex-grow, and CSS grid alignments remain completely unpolluted.

### C. Standard Iframe Event Loop
During visual preview sessions, updates are bound dynamically using standard HTML5 `window.postMessage` frame bindings. Changes made in the admin form dispatch updates to the preview frame, updating the state in real-time.

---

## 4. Co-located Block Schemas (Zod)

Instead of maintaining a separate CMS database schema, validation contracts live directly inside their corresponding React components:

```typescript
// apps/storefront/src/components/Hero/Hero.tsx
import { z } from 'zod';

export const HeroSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  ctaText: z.string(),
  imageUrl: z.string().optional(),
});
```

```typescript
// apps/storefront/src/components/ProductGrid/ProductGrid.tsx
import { z } from 'zod';

export const ProductGridSchema = z.object({
  title: z.string(),
  collectionId: z.string(),
  limit: z.number().int().default(4),
});
```

---

## 5. Page Templates & Discriminated Schema Unions

Rather than allowing arbitrary block lists, pages are structured via **Templates** (e.g. `LandingTemplate` vs. `BlogTemplate`). This enforces design consistency and block placement safety.

### A. Co-located Template Schemas
Each template script defines which layout properties it requires and restricts which blocks are allowed:

```typescript
// apps/storefront/src/templates/BlogTemplate/BlogTemplate.tsx
import { z } from 'zod';
import { HeroSchema } from '../../components/Hero/Hero';
import { TextSchema } from '../../components/Text/Text';

// The Blog Template requires author bio metadata and forbids ProductGrid blocks
export const BlogTemplateSchema = z.object({
  title: z.string(),
  template: z.literal('blog'),
  authorName: z.string().default('Blender Next Editorial'),
  blocks: z.array(
    z.union([
      z.object({ type: z.literal('Hero'), data: HeroSchema }),
      z.object({ type: z.literal('Text'), data: TextSchema })
    ])
  )
});
```

### B. Discriminated Union Parsing
The master schema validator inside [`src/schemas/page.ts`](../apps/storefront/src/schemas/page.ts) aggregates these templates using a Zod discriminated union. When a layout is loaded, Zod matches the `"template"` property first and validates the layout blocks against that specific template's rules:

```typescript
import { z } from 'zod';
import { LandingTemplateSchema } from '../templates/LandingTemplate/LandingTemplate';
import { BlogTemplateSchema } from '../templates/BlogTemplate/BlogTemplate';

export const PageSchema = z.discriminatedUnion('template', [
  LandingTemplateSchema,
  BlogTemplateSchema,
]);
```

---

## 6. Dynamic Component Registry Map & Code-Splitting

Eagerly importing dozens of page blocks at the top of a page client forces the browser to evaluate the bundle for all blocks, even if the current page only uses one. 

Blender Next maps layout blocks dynamically using **Next.js Dynamic Imports (`next/dynamic`)**, loading JS bundles on-demand to keep initial load sizes minimal:

```tsx
// apps/storefront/src/components/DynamicPageClient.tsx
import dynamic from 'next/dynamic';

const TemplateRegistry: Record<string, React.ComponentType<any>> = {
  landing: dynamic(() => import('../templates/LandingTemplate/LandingTemplate'), { loading: () => <p>Loading Layout...</p> }),
  blog: dynamic(() => import('../templates/BlogTemplate/BlogTemplate')),
};

export default function DynamicPageClient({ initialData, slug }: DynamicPageClientProps) {
  const { data, bind, isEditing } = useBlender<BlenderPage>({
    initialData,
    collectionName: 'pages',
    itemId: slug
  });

  const TemplateComponent = TemplateRegistry[data.template || 'landing'] || TemplateRegistry.landing;

  return (
    <main style={{ padding: '2rem', maxWidth: 'var(--max-width-container)', margin: '0 auto' }}>
      <h1 {...bind('title')}>{data.title}</h1>
      <TemplateComponent data={data} bind={bind} isEditing={isEditing} />
    </main>
  );
}
```

---

## 7. CSS Custom Property Theme System

To separate core presentation markup from React components, Blender Next implements a central **CSS Variable Theme System** inside [`src/app/globals.css`](../apps/storefront/src/app/globals.css). Hard-coded spacing, shadows, and colors are replaced by design tokens:

```css
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --background: #fcfcfd;
  --foreground: #111827;
  
  --card-background: #ffffff;
  --card-border: #e5e7eb;
  
  --color-primary: #4f46e5;
  --color-primary-foreground: #ffffff;
  
  --radius-md: 8px;
  --radius-lg: 16px;
  
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
}
```
Components consume these tokens cleanly using CSS properties:
```tsx
<div style={{ background: 'var(--card-background)', borderRadius: 'var(--radius-lg)' }} />
```

---

## 8. The CMS vs. PIM Boundary (E-commerce)

To scale visual editing inside active storefronts without introducing Git concurrency write bottlenecks, we enforce a strict separation of concerns:

*   **PIM (Product Information Manager)**: Dedicated systems (e.g., Shopify, Medusa) manage high-frequency transactional data like live price points, reviews, categories, and inventory.
*   **Blender Next**: Manages only the **editorial layout skeleton metadata** (e.g., configuring hero images, adding promo paragraphs, and placing collection grid slugs).

During render time, Server Components combine the static CMS skeleton with live PIM fetch calls:

```typescript
// apps/storefront/src/components/ProductGrid/ProductGrid.tsx
import { fetchCommerceProducts } from '../../lib/commerce';

export default function ProductGrid({ title, collectionId, limit }) {
  // Pulls live catalog states at request-time based on collectionId stored in CMS
  const products = fetchCommerceProducts(collectionId, limit);
  
  return (
    <div>
      <h3>{title}</h3>
      <div className="grid">
        {products.map(p => <ProductCard key={p.id} {...p} />)}
      </div>
    </div>
  );
}
```

---

## 9. Next.js 16 & React 19 Considerations

Upgrading the showcase storefront to Next.js 16 and React 19 requires accounting for the following breaking architectural changes:

*   **Asynchronous Dynamic Parameters**: Page `params` and `searchParams` are Promises. They must be explicitly typed as `Promise<T>` and unwrapped using `await params` in Server Component loaders.
*   **Bypassing Cache Locks**: Next.js 16 aggressively caches file fetches. To ensure local editor saves show up instantly during preview and dashboard sessions, page loaders and API handlers declare dynamic rendering:
    ```typescript
    export const dynamic = 'force-dynamic';
    ```
*   **Types Syncing**: React 19 development typings (`@types/react`) must be locked at the workspace package level to prevent TypeScript compiler definition overrides.
