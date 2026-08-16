# Blender Next: Engineering Roadmap

This document outlines the development phases to take the **Blender Next** layout engine from a local monorepo prototype to a production-grade, highly available enterprise storefront system.

---

## Phase 1: Security & Stability (Completed)

We audited and hardened the initial layout engine API to secure visual editor operations:

*   **Secured File Endpoints**: Restrained the page CRUD endpoints against arbitrary directory traversal by enforcing a strict regex whitelist (`/^[a-zA-Z0-9-_]+$/`) on slug parameters and verifying directory boundaries using relative path checks.
*   **Prevented Prototype Pollution**: Hardened the state setter `setNestedPath` to reject key paths containing `__proto__`, `constructor`, or `prototype`, preventing malicious editor payloads from altering the global JS scope.
*   **Enforced Origin Constraints**: Locked down the preview iframe bridge. PostMessage loops now dynamically resolve and validate target origins, ensuring page communications only occur between the storefront and the admin dashboard on the same host.

---

## Phase 2: High-Performance Page Delivery (Short-Term)

Focuses on optimizing storefront page loads for visitors and decoupling editing tools from static production builds.

### 1. targeted item loading (Avoid O(N) disk I/O)
*   **Current state**: Resolving a dynamic route scans the entire content folder, parsing and validating every JSON page layout to find a slug match.
*   **Planned implementation**: Replace folder scanning with direct file path lookups to read only the target layout file:
    ```typescript
    export async function loadCollectionItem<T extends z.ZodTypeAny>(
      collection: CollectionConfig<T>,
      itemId: string
    ): Promise<z.infer<T> | null> {
      const filePath = path.join(process.cwd(), collection.path, `${itemId}.json`);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return collection.schema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    ```

### 2. Next.js Draft Mode Integration (Restore ISR caching)
*   **Current state**: Storefront routes use `export const dynamic = 'force-dynamic'` to bypass Next.js caching, ensuring page edits show up instantly.
*   **Planned implementation**: Leverage native Next.js **Draft Mode**. Storefront routes will serve cached static builds (ISR) to regular visitors by default. When an editor logs in, the dashboard enables Draft Mode, forcing dynamic rendering *only* for that preview session.

### 3. Server-Only Layout Rendering (RSC Cascade)
*   **Current state**: The storefront wrapper `DynamicPageClient` is marked `'use client'`, forcing all template and block components inside it to bundle and hydrate client-side.
*   **Planned implementation**: Separate layout templates into Server Components. The browser will only download the page-builder editing bundle if the user is explicitly in edit mode (`edit=true`).

---

## Phase 3: SQLite Cache Sync Engine (Mid-Term)

Focuses on scaling storage lookup performance as pages grow from dozens to thousands.

*   **Local Metadata Indexing**: We will introduce a lightweight sync script running Bun's native SQLite driver. During build time or via local watchers, the engine parses content JSONs and indexes slug metadata into a query-optimized `.blender/cache.db`.
*   **Fast Listings and Search**: The page administration sidebar will query the SQLite database instead of running filesystem scans:
    ```sql
    SELECT id, title FROM pages WHERE title LIKE ? LIMIT 20 OFFSET ?;
    ```
    This reduces lookup times to sub-milliseconds and enables search and pagination out-of-the-box.

---

## Phase 4: Git-Backed Campaign Automation (Long-Term)

Focuses on automating Git operations within the editorial dashboard.

*   **API Git Client**: Integrate a lightweight Git client (e.g. `simple-git` or shell subprocesses) on the CMS API server.
*   **Branch-per-Campaign Creation**: Clicking "New Campaign: Summer Sale" will trigger the server to create and check out `campaign/summer-sale` off `main`. Saves made in the dashboard will commit directly to this branch.
*   **Automated PR Submissions**: Add a "Submit for Review" button to the sidebar. Clicking it will trigger the API to open a Pull Request on GitHub on behalf of the editor, allowing developers to review the JSON layout diff before merging.
