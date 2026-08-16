# Blender Next: Architectural Trade-offs & Limitations

While a Git-backed, code-first layout engine like **Blender Next** offers massive advantages for developer experience, type safety, and DOM performance, it introduces significant trade-offs at scale. This document provides an objective analysis of the core limitations, security risks, and operational bottlenecks of this architectural approach.

---

## 1. Concurrency & Merge Conflict Bottlenecks (Write Scale)

*   **The Flaw**: Databases excel at high-frequency concurrent writes. Git does not. If multiple content editors modify different sections of the same page layout simultaneously on a shared campaign branch, Git will reject concurrent pushes, resulting in write conflicts.
*   **The Impact**: Non-technical content editors cannot resolve Git merge conflicts. Without complex custom locking systems (e.g. pessimistic locking APIs) or automated sub-branching/rebase orchestrations on the backend, editor productivity will grind to a halt in multi-editor organizations.

---

## 2. The Distributed State Problem (CMS vs. PIM Sync)

*   **The Flaw**: There are two separate systems of record: Git (holding the editorial layout skeletons) and a transactional database/PIM (holding inventory, catalog pricing, and promotions). 
*   **The Impact**: Launching a campaign requires a "two-phase commit" across disconnected systems. If the campaign Git branch merges to `main` successfully, but the database update to active product listings fails (or vice versa), the storefront falls into an inconsistent state (rendering dead layouts or missing catalog blocks).

---

## 3. Security & Code-Injection Risks (Privilege Escalation)

*   **The Flaw**: In Blender Next, **code and content live in the same Git repository**. The CMS web API server must possess write credentials (SSH keys or OAuth tokens) to commit files back to the repository.
*   **The Impact**: If an editor's dashboard session is compromised, or if the visual editor's input parsing is bypassed, a malicious actor could write edits that modify actual application source code (e.g. rewriting `/apps/storefront/src/app/[slug]/page.tsx` or package files). This is a massive privilege escalation vector compared to traditional Headless CMS platforms where content data is strictly isolated from application runtime source code.

---

## 4. Repository Bloat & Git Performance

*   **The Flaw**: Every single typo fix, block reordering, or draft save creates a Git commit. A busy marketing team can easily generate tens of thousands of commits per year.
*   **The Impact**: The local `.git` history database will bloat rapidly. Over time, standard developer Git operations (like `git status`, `git checkout`, and initial clones in CI/CD pipelines) will slow down due to the massive commit graph size, degrading overall developer experience.

---

## 5. Binary Access Control (RBAC Limitations)

*   **The Flaw**: Traditional headless CMS platforms support granular Role-Based Access Control (e.g., Jane can only edit blog posts; John can only edit home page banners). Git repository write permissions are typically binary (you either have write permission to a directory/branch or you don't).
*   **The Impact**: Enforcing fine-grained organizational permission structures requires building a custom validation proxy inside the CMS middleware, as Git cannot natively enforce row-level or field-level edit restrictions for individual writers.

---

## 6. Developer Dependency (Rigid Extension Models)

*   **The Flaw**: Since block validation schemas are co-located in React code (Zod), content editors cannot create new layout models, custom attributes, or content types independently in the web dashboard.
*   **The Impact**: Every marketing request for a new visual component or structural block requires a developer to write a React component, define a Zod schema, and commit it to code. This can create a bottleneck for marketing teams used to building ad-hoc landing page structures.
