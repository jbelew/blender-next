# Blender Next: Architectural, Security, and Performance Review

This review evaluates the current state of the **Blender Next** prototype, highlighting critical security vulnerabilities, performance bottlenecks, and architectural discrepancies between the design specs and the implemented codebase.

---

## 🚨 1. Critical Security Vulnerabilities (Patched & Resolved)

### A. Arbitrary Path Traversal & File Deletion (Resolved)
*   **Location**: [`index.ts`](file:///home/jbelew/projects/uncms/packages/core/src/index.ts#L48-L61) and [`route.ts`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/api/blender/route.ts#L34-L80)
*   **The Issue**: The `itemId` was accepted directly from the client request body (e.g. via `POST /api/blender`) and passed without verification or sanitization to `saveCollectionItem` and `fs.unlink`.
*   **Resolution**: Patched by adding strict regex validation `/^[a-zA-Z0-9-_]+$/` to `itemId` in both `saveCollectionItem` and the API route handler. We also added path boundary checks using `path.relative` to ensure resolved files remain inside the collection's target folder.

### B. Client-Side Prototype Pollution (Resolved)
*   **Location**: [`setNestedPath`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/admin/page.tsx#L8-L27) in the admin panel.
*   **The Issue**: The helper split path keys (e.g. `__proto__.polluted`) by `.` and recursively assigned properties on the target object without sanitizing built-in keys like `__proto__`, `constructor`, or `prototype`.
*   **Resolution**: Patched by validating path segments and rejecting keys like `__proto__`, `constructor`, or `prototype` in the path resolution traversal, returning the original object unchanged if a violation is detected.

### C. Missing Origin Constraints in Event Bridge (Resolved)
*   **Location**: [`index.ts`](file:///home/jbelew/projects/uncms/packages/react/src/index.ts#L26-L64) and [`page.tsx`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/admin/page.tsx#L57-L80)
*   **The Issue**:
    1.  The iframe event bridge used `window.parent.postMessage(..., '*')`, publishing internal storefront schema structures to any parent frame that embedded it.
    2.  Neither the preview page nor the admin window validated `event.origin` when subscribing to message listeners.
*   **Resolution**: Patched by dynamically resolving `window.location.origin` as the target origin during `postMessage` calls and validating `event.origin === window.location.origin` on all message event listeners to restrict communications to the same host origin.

---

## ⚡ 2. Performance & Scalability Bottlenecks

### A. O(N) Collection Loading Bottleneck (High)
*   **Location**: [`loadCollection`](file:///home/jbelew/projects/uncms/packages/core/src/index.ts#L18-L43) and [`page.tsx`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/[slug]/page.tsx#L24-L35)
*   **The Issue**: There is no API method to load a single item (e.g., `loadCollectionItem`). To resolve a single page by its `_id`, the system reads, JSON-parses, and Zod-validates *every single file* inside `/content/pages` on every request.
*   **Impact**: As the page count scales to hundreds or thousands of pages, page resolution latency will increase linearly, causing severe CPU and disk I/O bottlenecks.
*   **Remedy**: Implement a targeted item loader:

```typescript
export async function loadCollectionItem<T extends z.ZodTypeAny>(
  collection: CollectionConfig<T>,
  workspaceRoot: string,
  itemId: string
): Promise<z.infer<T> | null> {
  const filePath = path.resolve(workspaceRoot, collection.path, `${itemId}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return collection.schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
```

### B. Global Cache Disabling (`force-dynamic`)
*   **Location**: [`page.tsx`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/[slug]/page.tsx#L8)
*   **The Issue**: The storefront dynamic page route forces rendering dynamically: `export const dynamic = 'force-dynamic'`.
*   **Impact**: Next.js App Router caching is disabled, and ISR is entirely bypassed. This is in direct conflict with the [**Scaling Strategy Specification**](file:///home/jbelew/projects/uncms/docs/scaling_strategy.md#L39-L66) where ISR is planned to deliver sub-millisecond cached responses.
*   **Remedy**: Leverage Next.js **Draft Mode** to conditionally disable caching. Only bypass static caching when a dynamic preview token is present:

```typescript
import { draftMode } from 'next/headers';

// Inside Page component
const { isEnabled: isDraft } = await draftMode();
// Force-dynamic bypass or direct draft-preview resolution
```

### C. Client Component Hydration Cascade (Medium)
*   **Location**: [`DynamicPageClient.tsx`](file:///home/jbelew/projects/uncms/apps/storefront/src/components/DynamicPageClient.tsx)
*   **The Issue**: The wrapper `<DynamicPageClient>` is marked `"use client"`. Consequently, every component nested inside it—including templates ([`LandingTemplate`](file:///home/jbelew/projects/uncms/apps/storefront/src/templates/LandingTemplate/LandingTemplate.tsx) and [`BlogTemplate`](file:///home/jbelew/projects/uncms/apps/storefront/src/templates/BlogTemplate/BlogTemplate.tsx)) and individual blocks (Hero, Text, ProductGrid)—is forced to render as a client component.
*   **Impact**: Standard site visitors (who don't need dynamic editing capabilities) still download, execute, and hydrate the entire page-builder runtime. This breaks the Server Component design goal of serving zero client-side JavaScript for visual layout structures.
*   **Remedy**: Split the layouts into standard Server Component templates for visitors, and dynamically switch to the client component editor wrapper (`<DynamicPageClient>`) *only* when the edit parameter is active (`edit=true`).

---

## 🛠️ 3. Architecture Gaps (Concept vs. Implementation)

Several components defined in the architectural plans are currently completely unimplemented or missing:

| Feature / Architecture Document | Plan / Specification | Actual Status in Codebase |
| :--- | :--- | :--- |
| **SQLite Index Cache** | [**Scaling Strategy**](file:///home/jbelew/projects/uncms/docs/scaling_strategy.md): Build `.blender/cache.db` to paginate queries and prevent slow directory scanning. | **Unimplemented**. No database package (e.g. SQLite, Bun DB) or watcher (e.g., Chokidar) exists in workspace dependency manifests. |
| **Git Campaign Integration** | [**Git Campaign Workflows**](file:///home/jbelew/projects/uncms/docs/git_campaign_workflows.md): Automate Git branches, commits, and Pull Requests when saving/publishing page structures. | **Unimplemented**. Saving modifications writes files to disk directly. No subprocess calls or Git packages exist in the API layer. |
| **Asynchronous params Types** | [**Technical Spec**](file:///home/jbelew/projects/uncms/docs/architecture_specification.md#L258-L267): React 19 / Next.js 16 breaking change updates dynamic route typing. | **Partially Implemented**. Dynamic `params` are typed correctly as promises, but `searchParams` is omitted in page parameters. |

---

## 📈 4. Roadmap and Recommendations

To prepare the Blender Next layout engine for production, we recommend targeting three key areas:

1.  **Vulnerability Patches (Patched & Verified)**: We have added parameter validation (`itemId` regex and containment checks) to secure file endpoints against traversal, and implemented prototype key filtering in `setNestedPath` along with origin checks for the `postMessage` loops.
2.  **RSC-First Routing Layout**: Modify [`[slug]/page.tsx`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/[slug]/page.tsx) to check for Draft Mode / Search Params. If editing is inactive, render a server-only layout that streams static ISR code. Switch to `<DynamicPageClient>` only when previewing.
3.  **Implement `@blender-next/core` SQLite Sync**: Incorporate a filesystem watcher that runs during the build and dev phases to populate a local SQLite metadata database, allowing the API route to support pagination and search features natively.
