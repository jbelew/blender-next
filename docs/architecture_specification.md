# Blender Next: Technical Architecture Specification

This specification covers the technical architecture and schema validation details for **Blender Next**—a Git-backed layout engine built for **Next.js 16 (App Router)**, **React 19**, and monorepos.

---

## Table of contents
1. [Core philosophy](#1-core-philosophy)
2. [Monorepo structure](#2-monorepo-structure)
3. [Visual editor event bridge](#3-visual-editor-event-bridge)
4. [Co-located block schemas](#4-co-located-block-schemas)
5. [Page templates and discriminated unions](#5-page-templates-and-discriminated-unions)
6. [Dynamic component registry](#6-dynamic-component-registry)
7. [CSS variable theme system](#7-css-variable-theme-system)
8. [The CMS vs. PIM boundary](#8-the-cms-vs-pim-boundary)
9. [Next.js 16 & React 19 considerations](#9-nextjs-16--react-19-considerations)

---

## 1. Core philosophy

Standard headless CMS setups force you to sync schemas between database dashboards and front-end code. They also pollute the DOM with nested helper divs that break flexbox and CSS grid layouts.

Blender Next addresses these issues through:
*   **Git-backed layouts**: Page structures are stored as flat JSON files in Git. This lets developers and content creators use standard branching, rollbacks, and Pull Request workflows.
*   **Co-located schemas**: Layout schemas are defined next to React components using **Zod**, keeping content validation in sync with code updates.
*   **Clean DOM output**: Standard HTML attributes (`data-blender-field`) map storefront components directly to schema fields. We do not inject layout-breaking helper container divs.
*   **Server-side performance**: Storefront pages render as Next.js Server Components, removing CMS parser bundle weight from the client.

---

## 2. Monorepo structure

We isolate the core packages from the storefront implementation using Bun workspaces:

```text
blender-next/
├── apps/
│   └── storefront/                 # Next.js 16 Storefront (Turbopack, React 19)
│       ├── src/
│       │   ├── app/
│       │   │   ├── [slug]/page.tsx # Dynamic layout route (SSR/ISR, async params)
│       │   │   ├── admin/page.tsx  # Iframe edit panel & sidebar form
│       │   │   └── globals.css     # CSS variable custom properties
│       │   ├── components/         # Page builder block components
│       │   │   ├── Hero/
│       │   │   │   └── Hero.tsx    # Component JSX + HeroSchema
│       │   │   ├── Text/
│       │   │   │   └── Text.tsx    # Component JSX + TextSchema
│       │   │   └── ProductGrid/
│       │   │       └── ProductGrid.tsx # Component JSX + ProductGridSchema
│       │   ├── templates/          # Visual page shells
│       │   │   ├── LandingTemplate/# Full-width page shell
│       │   │   └── BlogTemplate/   # Split sidebar page shell
│       │   ├── schemas/
│       │   │   └── page.ts         # Master page schema definition
│       │   └── blender.ts          # Page layouts configuration
├── packages/
│   ├── core/                       # JSON file loaders & Zod parsers
│   └── react/                      # Preview hooks & iframe postMessage listener
├── content/
│   └── pages/                      # Git-backed JSON layout files
│       ├── home.json
│       └── about.json
└── package.json
```

---

## 3. Visual editor event bridge

To support inline editing, we map DOM elements back to JSON config files using simple annotations and iframe messaging:

### A. Element binding attributes
We annotate storefront markup using a `bind()` utility:
```tsx
<h2 {...bind(`blocks.${index}.data.title`)}>
  {title}
</h2>
```
This resolves to a standard browser attribute: `data-blender-field="blocks.0.data.title"`. 

### B. Clean markup
Forwarding these keys as custom attributes ensures that we do not need to wrap JSX tags in utility container divs. Layout grids, absolute positions, and flex properties remain unaffected.

### C. Iframe messaging loop
In edit mode, visual updates sync using `window.postMessage` frame bindings. Typing in the admin sidebar sends updates directly to the preview frame, updating the React state in real-time.

---

## 4. Co-located block schemas

Instead of managing database column definitions, validation rules live inside the React component files:

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

## 5. Page templates and discriminated unions

Pages are governed by specific structural templates (e.g. `LandingTemplate` or `BlogTemplate`) to restrict which blocks are allowed where.

### A. Template schemas
Each template file defines its custom metadata and the components it permits:

```typescript
// apps/storefront/src/templates/BlogTemplate/BlogTemplate.tsx
import { z } from 'zod';
import { HeroSchema } from '../../components/Hero/Hero';
import { TextSchema } from '../../components/Text/Text';

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

### B. Discriminated union parsing
The master validator inside [`src/schemas/page.ts`](../apps/storefront/src/schemas/page.ts) aggregates these templates using a Zod discriminated union. When parsing a page, Zod checks the `template` key first, then runs validation against that template's rules:

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

## 6. Dynamic component registry

Importing all blocks eagerly at the top of a page forced Turbopack to compile every script bundle, slowing down initial load times.

Blender Next loads layout components on-demand using **Next.js Dynamic Imports (`next/dynamic`)**:

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

## 7. CSS variable theme system

To separate block code from raw styling values, we define layout styles globally in [`src/app/globals.css`](../apps/storefront/src/app/globals.css):

```css
:root {
  --font-sans: system-ui, -apple-system, sans-serif;
  --background: #fcfcfd;
  --foreground: #111827;
  
  --card-background: #ffffff;
  --card-border: #e5e7eb;
  
  --color-primary: #4f46e5;
  --color-primary-foreground: #ffffff;
  
  --radius-md: 8px;
  --radius-lg: 16px;
  
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
```

Components reference these custom properties directly:
```tsx
<div style={{ background: 'var(--card-background)', borderRadius: 'var(--radius-lg)' }} />
```

---

## 8. The CMS vs. PIM boundary

To avoid database bottlenecks and keep page loads fast, we decouple layout skeletons from product catalogs:

*   **PIM (Product Information Manager)**: Systems like Shopify or Medusa manage dynamic checkout state, inventory levels, pricing, and ratings.
*   **Blender Next**: Manages only page skeletons (hero images, copywriting paragraphs, and catalog grids reference slugs).

At request time, Server Components combine the static layout configuration with live PIM queries:

```typescript
// apps/storefront/src/components/ProductGrid/ProductGrid.tsx
import { fetchCommerceProducts } from '../../lib/commerce';

export default function ProductGrid({ title, collectionId, limit }) {
  // Fetch live products based on the PIM collection ID saved in CMS JSON
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

## 9. Next.js 16 & React 19 considerations

Upgrading the storefront storefront to Next.js 16 and React 19 requires managing these changes:

*   **Asynchronous routing params**: Dynamic page `params` and `searchParams` are Promises. They must be typed as `Promise<T>` and resolved using `await params` in Server Components.
*   **Next.js dynamic routing**: Next.js 16 caches file reads aggressively. To ensure editor saves render instantly in preview dashboards, layout loaders use:
    ```typescript
    export const dynamic = 'force-dynamic';
    ```
*   **React 19 types configuration**: React 19 types must be explicitly locked in monorepo workspaces to prevent typings drift in external dependencies.
