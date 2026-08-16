# Design System Strategy: Why Shadcn UI?

Choosing a UI library for a dynamic, schema-validated layout engine like **Blender Next** directly affects page rendering speed, layout data bindings, and client-side bundle size. 

Here is why we chose **Shadcn UI** (Radix UI + Tailwind CSS) over traditional, pre-compiled UI frameworks like Material UI (MUI), Chakra UI, or Semantic UI.

---

## 1. Code Ownership & Schema Bindings

To map storefront elements to layout fields in edit mode, our components need to accept custom attributes (like `data-blender-field`).

*   **Pre-Compiled Libraries**: UI systems inside `node_modules` are immutable. Adding custom attributes means writing verbose wrapper layers around every element or overriding complex themes.
*   **The Shadcn Approach**: Shadcn copies the raw component code directly into the workspace (e.g. `src/components/ui/button.tsx`).

Because we own the component source files, we can extend the TypeScript interfaces and spread our metadata bindings directly on the native HTML tags:
```typescript
// We can directly extend the component's interface:
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  bindField?: any; // Native Blender Next field metadata mapper
}

// And spread it directly on the tag:
<button {...bindField} {...props} />
```

---

## 2. Zero DOM Pollution & Styling Transparency

Traditional CMS platforms often inject helper divs to outline selected visual blocks. This breaks flexbox, CSS grid alignments, and absolute positioning.

Shadcn uses Radix UI primitives under the hood. Radix provides unstyled, accessible behavioral components that do not render wrapping layout container nodes. This keeps the storefront DOM clean and ensures our layout configurations don't break CSS grids.

---

## 3. On-Demand Code Splitting

Importing components from pre-compiled libraries often pulls in transitively imported utility functions, icon sets, or theme context providers, inflating the client bundle.

Shadcn components import only their immediate Radix dependencies. This allows Next.js 16 Turbopack to code-split component bundles on-demand. If a page template only uses a `Hero` block, the browser client never loads code or styles for product listings or other unused elements.

---

## 4. CSS Custom Property Theme Integration

Instead of relying on complex JS-in-CSS configuration objects or custom provider tags, Shadcn UI styling maps directly to standard CSS variable custom properties (`var(--background)`, `var(--radius-md)`).

We define all layout parameters inside a single stylesheet: [`globals.css`](../apps/storefront/src/app/globals.css). Rebranding the entire storefront takes a few CSS variable updates, with zero JavaScript modifications.

---

## 5. What About Asteryx?

Asteryx is a declarative component system designed to be highly "LLM friendly," meaning AI coding assistants can generate layouts and write styles easily because behaviors are mapped to predictable configurations.

We decided not to choose Asteryx for a few reasons:
*   **Next.js 16 Server Components Support**: Shadcn components are fully compatible with React Server Components (RSC) out-of-the-box. Asteryx relies heavily on client-side state machine scripts, which limits server-side rendering performance.
*   **Familiarity and Ecosystem**: Shadcn UI has a massive developer community. Hiring and onboarding developers who already know Shadcn and Tailwind is straightforward, whereas Asteryx introduces a niche toolchain learning curve.
*   **Local Code is Already AI-Friendly**: While Asteryx has structured UI states, **Shadcn is also highly LLM-friendly**. Because the source code for every component lives directly in the workspace, AI assistants (like Antigravity) can read, modify, and style component files natively without library constraints.
