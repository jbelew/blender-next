# Design System Strategy: Why Shadcn UI?

For a schema-validated, Git-backed layout engine like **Blender Next**, the choice of UI library directly impacts visual rendering efficiency, data-binding capabilities, and bundle size performance. 

This document outlines why Blender Next chose **Shadcn UI** (Radix UI + Tailwind CSS) over traditional pre-compiled design system frameworks (like Material UI (MUI), Chakra UI, or Semantic UI).

---

## 1. Code Ownership & Schema Bindings (The Primary Driver)

To support visual data editing, storefront layout components must accept custom tracking properties (like the `bind()` data path mapper) and render custom elements (like spreading `data-blender-field` keys).

*   **Pre-Compiled Libraries (e.g., MUI, Chakra)**: These libraries live inside `node_modules` as immutable compiled packages. To add custom attributes, you must write verbose wrappers around every imported element or attempt to inject props through complex custom theme overrides.
*   **Shadcn UI Pattern**: Shadcn is not a dependency library; it is a CLI that copies raw component source code directly into your project's workspace (e.g. `src/components/ui/button.tsx`).
*   **The Advantage**: Developers have **full ownership** of the component source code. We can modify the properties interface and spread custom attributes directly on the native HTML tags:
    ```typescript
    // We can directly extend the component's interface in our codebase:
    export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      bindField?: any; // Native Blender Next field data mapper
    }
    
    // And spread it directly on the node:
    <button {...bindField} {...props} />
    ```

---

## 2. Zero DOM-Pollution & Structural Layout Integrity

Traditional database-backed CMS platforms and heavy UI frameworks often wrap components in helper containers (like layout wrappers or inline style providers) to hook up visual edits. This breaks CSS flexbox, grid alignments, and absolute positions.

*   **Radix Headless Primitives**: Shadcn uses Radix UI primitives under the hood. Radix provides unstyled, accessible behavioral components that do not render wrapping nodes.
*   **The Advantage**: Storefront markup remains clean. We spread Blender Next annotations on the exact native tags, guaranteeing the design system's layout structure and CSS flex/grid relationships remain unpolluted.

---

## 3. High-Performance Code Splitting & Zero-Bloat Bundles

Pre-compiled packaged libraries can easily bloat client-side bundles because importing a single complex component can pull in massive transitive theme engines, context providers, or large icon sets.

*   **Fine-Grained Dependencies**: In Shadcn, each component is a single file importing only what it needs (e.g. just `@radix-ui/react-accordion` for accordions).
*   **The Advantage**: Next.js 16 Turbopack can optimize and code-split component code on-demand. If a page template only loads a `Hero` block, the browser client never loads code for product listings or accordions.

---

## 4. CSS Custom Property Theme Integration

*   **Standard CSS Variables**: Shadcn UI relies on standard CSS variable custom properties (`var(--background)`, `var(--radius-md)`) rather than CSS-in-JS style objects.
*   **The Advantage**: Blender Next maps layout tokens directly to Shadcn styles inside a single, central [`globals.css`](file:///home/jbelew/projects/uncms/apps/storefront/src/app/globals.css) sheet. Rebranding the entire design system (colors, borders, typography, spacing) requires zero JavaScript modifications.

---

## 5. Asteryx vs. Shadcn UI (The LLM-Friendliness Trade-off)

*   **What is Asteryx**: Asteryx is a declarative styling/component system designed specifically to be "LLM friendly," enabling AI coding assistants to generate layouts and modify properties reliably due to its highly structured, state-machine-backed configuration patterns.
*   **Why We Didn't Choose It**:
    1.  **Ecosystem Maturity & Developer Familiarity**: Shadcn UI has a massive developer community and extensive copy-paste resources. For enterprise projects, selecting standard frameworks that developers already know speeds up onboarding and recruitment compared to niche AI-first tools.
    2.  **Next.js 16 / React Server Components Integration**: Shadcn components are lightweight and compatible with React Server Components (RSC) out-of-the-box. Asteryx's heavy use of client-side state machine configurations limits server-side rendering optimization.
    3.  **Local Codebase-Level LLM Friendliness**: While Asteryx has highly structured schema representations, **Shadcn is also highly LLM-friendly**. Because the source code for every component is written directly in the project (rather than pre-compiled inside `node_modules`), AI coding assistants (like Antigravity) can read, modify, and style component files natively without library constraints.
