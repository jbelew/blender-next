# Blender Next: Architectural Trade-offs & Limitations

A Git-backed, code-first layout engine makes life easier for developers and improves page-load performance, but it introduces real problems at scale. This document breaks down the core limitations, security risks, and operational bottlenecks of this approach.

---

## 1. Concurrency and Merge Conflicts

Databases are built for high-frequency concurrent writes. Git is not. If two editors try to modify the same page layout on a shared campaign branch at the same time, Git will reject the second push, creating a merge conflict.

Because non-technical editors cannot resolve Git conflicts, write scaling is highly constrained. Without implementing custom page locking APIs or automated rebasing on the backend, editor productivity will stall in multi-editor teams.

---

## 2. The Distributed State Problem (CMS vs. PIM Sync)

In this architecture, you run two separate systems of record: Git (holding the page layout structures) and a transactional database or PIM (holding product catalogs, pricing, and stock levels).

Launching a campaign requires updating both systems at the same time. If the Git branch merges successfully but the PIM database update fails, the storefront enters an inconsistent state—like rendering campaign hero banners for products that do not exist or are out of stock.

---

## 3. Security and Code-Injection Risks

In Blender Next, application code and page layout content live in the same Git repository. This means the CMS web API server must have write access keys (SSH keys or OAuth tokens) to commit layout files back to the repo.

If an editor's session is compromised, or if the API's input validation is bypassed, an attacker can push edits that modify actual application source code (like rewriting route files or components). This is a severe privilege escalation vector compared to traditional database-backed CMS platforms, which strictly isolate content data from application source files.

---

## 4. Repository Bloat and Git Performance

Every typo fix, block reordering, or draft save creates a Git commit. A busy marketing team can generate tens of thousands of commits a year.

As a result, the local `.git` directory will bloat. Over time, standard Git operations (like `git status`, `git checkout`, and initial repository clones in CI/CD pipelines) will slow down due to the size of the commit graph, degrading the developer experience.

---

## 5. Binary Access Control (RBAC Limitations)

Traditional headless CMS platforms support granular, field-level Role-Based Access Control (e.g. allowing Jane to edit only blog posts, and John to edit only hero copy). Git write permissions, however, are binary. You either have write access to the branch or folder, or you do not.

Enforcing granular editing permissions requires building a custom validation proxy inside the CMS middleware, as Git cannot natively restrict access at the row or field level.

---

## 6. Rigid Extension Models (Developer Dependency)

Because block schemas are co-located in React code using Zod, editors cannot create new block types, custom layout patterns, or configuration fields independently in the dashboard.

Every request for a new visual component or structural block requires a developer to write the React code, define the Zod validation rules, and push the change to Git. This creates a dependency bottleneck for marketing teams used to building ad-hoc landing page structures.
