# Blender Next: Security, Performance, and Architecture Review

This document reviews the current state of the Blender Next prototype. It outlines security fixes, highlights performance bottlenecks, and identifies gaps between the initial specification and the current codebase.

---

## 1. Security vulnerabilities (Patched & resolved)

### A. Path traversal and arbitrary file deletion
*   **Location**: [`index.ts`](../packages/core/src/index.ts) and [`route.ts`](../apps/storefront/src/app/api/blender/route.ts)
*   **What was wrong**: The API accepted `itemId` directly from the client request payload without validation, passing it directly to `saveCollectionItem` and `fs.unlink`. An attacker could send parent directory paths (e.g. `../../package.json`) to read or delete arbitrary files on the host system.
*   **The fix**: We added validation using a strict whitelist regex `/^[a-zA-Z0-9-_]+$/` to `itemId` in the loader and the API route. We also added boundary checks using `path.relative` to ensure files stay inside the collection's target folder.

### B. Client-side prototype pollution
*   **Location**: [`setNestedPath`](../apps/storefront/src/app/admin/page.tsx) in the admin panel.
*   **What was wrong**: The helper split path keys (e.g. `blocks.0.data.title`) by `.` and recursively assigned values on the state object. Because it did not sanitize keys, an editor could pass input keys like `__proto__` or `constructor` to pollute the global JavaScript prototype chain.
*   **The fix**: We patched the path traversal loop to reject keys containing `__proto__`, `constructor`, or `prototype`, returning the original state object unchanged if a violation is found.

### C. Missing origin constraints in event bridge
*   **Location**: [`index.ts`](../packages/react/src/index.ts) and [`page.tsx`](../apps/storefront/src/app/admin/page.tsx)
*   **What was wrong**:
    1.  The preview iframe sent layout updates using `window.parent.postMessage(..., '*')`, broadcasting internal layout properties to any parent document.
    2.  Neither the preview page nor the admin container verified `event.origin` when listening to postMessage events.
*   **The fix**: We set `window.location.origin` as the target origin during `postMessage` calls and added validation checks (`event.origin === window.location.origin`) on all message event listeners to restrict traffic to the same host.

---

## 2. Performance and scaling bottlenecks

### A. Dynamic page resolution latency (O(N) reads)
*   **Location**: [`loadCollection`](../packages/core/src/index.ts) and [`page.tsx`](../apps/storefront/src/app/[slug]/page.tsx)
*   **What was wrong**: There is no API method to load a single item. To resolve a page by its slug, the system reads, JSON-parses, and validates *every single file* inside the pages content directory on every request.
*   **The impact**: As the page count scales to hundreds or thousands of pages, page resolution latency will increase linearly, causing severe CPU and disk bottlenecks.
*   **The solution**: Implement a targeted item loader:
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

### B. Global cache disabling (`force-dynamic`)
*   **Location**: [`page.tsx`](../apps/storefront/src/app/[slug]/page.tsx)
*   **What was wrong**: The storefront dynamic page route forces dynamic rendering: `export const dynamic = 'force-dynamic'`.
*   **The impact**: Next.js App Router caching is disabled, and ISR is bypassed. This contradicts the scaling specification where ISR is planned to deliver sub-millisecond cached responses.
*   **The solution**: Use Next.js Draft Mode. Only bypass static caching when a dynamic preview token is present:
    ```typescript
    import { draftMode } from 'next/headers';
    
    // Inside Page component
    const { isEnabled: isDraft } = await draftMode();
    ```

### C. Client component hydration cascade
*   **Location**: [`DynamicPageClient.tsx`](../apps/storefront/src/components/DynamicPageClient.tsx)
*   **What was wrong**: The wrapper `<DynamicPageClient>` is marked `"use client"`. Consequently, every component nested inside it—including templates (`LandingTemplate` and `BlogTemplate`) and blocks (Hero, Text, ProductGrid)—is forced to render as a client component.
*   **The impact**: Regular site visitors download, execute, and hydrate the entire page-builder editing state, breaking the Server Component design goal of serving zero client-side JavaScript for visual layout structures.
*   **The solution**: Split the layout templates into standard Server Components for visitors, and dynamically switch to the client editor wrapper (`<DynamicPageClient>`) *only* when the edit parameter is active (`edit=true`).

---

## 3. Architecture gaps

Several components defined in the architectural plans are currently completely unimplemented or missing:

*   **SQLite index cache**: The scaling strategy plans to build `.blender/cache.db` to paginate queries and prevent slow directory scanning. Currently, no database package or watcher is defined in workspace dependency manifests.
*   **Git campaign integration**: The campaign branching specs outline automated branches, commits, and Pull Requests when saving/publishing page structures. Currently, saving modifications writes files to disk directly. No subprocess calls or Git packages exist in the API layer.
*   **Asynchronous params types**: Dynamic `params` are typed correctly as promises, but `searchParams` is omitted in page parameters.

---

## 4. Roadmap recommendations

To prepare the Blender Next layout engine for production, we recommend targeting three key areas:
1.  **RSC-first routing layout**: Modify `[slug]/page.tsx` to check for Draft Mode or Search Params. If editing is inactive, render a server-only layout that streams static ISR code. Switch to the editor client wrapper only when previewing.
2.  **Implement SQLite sync**: Add a filesystem watcher that runs during the build and dev phases to populate a local SQLite metadata database, allowing the API route to support pagination and search natively.
3.  **Deploy campaign automation**: Hook up a Git client on the API server to automate commits and branches when changes are saved in the dashboard, automating PR generation.
