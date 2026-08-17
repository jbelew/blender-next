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

---

## 6. Tailwind vs. BEM (CSS Architecture)

Traditional storefront systems (including older XML/XSLT layout platforms) historically relied on the **BEM (Block, Element, Modifier)** naming convention for stylesheets:
*   e.g., `.merchant-card {}`, `.merchant-card__title {}`, `.merchant-card__title--featured {}`.

While BEM keeps HTML tags clean of class clutter, it introduces significant issues compared to Tailwind's utility-first approach in a dynamic page-builder context:

### Naming fatigue and bloated stylesheets
With BEM, developers must constantly invent semantic class names for every structural wrapper. Over time, as layout features evolve, stylesheets become "append-only" because developers are afraid to delete CSS rules in case they are used elsewhere. Tailwind stops this CSS bloat. The final stylesheet size plateaus (usually under 15KB) because the build compiler extracts only the atomic utility classes used.

### Schema validation co-location
In Blender Next, page layouts are serialized as JSON data. We want editors to configure block padding, alignment, and border-radius in the sidebar. 
*   **Using Tailwind**: We can validate layout configurations directly in our Zod schema using strict class name enums:
    ```typescript
    export const HeroSchema = z.object({
      padding: z.enum(['p-4', 'p-8', 'p-12']).default('p-8'),
      borderRadius: z.enum(['rounded-none', 'rounded-md', 'rounded-lg']).default('rounded-md')
    });
    ```
    The React component renders these classes directly.
*   **Using BEM**: We would have to create custom modifier classes (e.g. `hero--p-8`, `hero--rounded-md`) and maintain matching custom CSS rules for every permutation, introducing a major translation layer and layout rigidity.

### Local reasoning & AI generation
Tailwind co-locates styles inside the JSX markup. When reviewing a component, you immediately see its layout properties without jumping between CSS and TSX files. Furthermore, AI coding assistants (like Antigravity) are highly efficient at generating Tailwind classes, whereas generating BEM styles often results in class name mismatches and broken styling sheets.

---

## 7. Dependency Risk Mitigation (The Tailwind/Radix Question)

A common concern with choosing Shadcn UI is the health of its underlying dependencies. For example, Radix UI primitive releases have slowed down since the WorkOS acquisition, and Tailwind Labs faced financial and staffing challenges in early 2026 due to AI-driven search shifts [1, 2]. 

However, Shadcn's decoupled copy-paste architecture is actually the best insurance policy against these exact platform risks.

### Tailwind's financial model vs. open-source utility CSS
Tailwind Labs experienced a notable revenue drop in 2026, leading to staff downsizings [1, 2]. However, the core utility-class engine is fully open-source, MIT-licensed, and widely forked. Additionally, major industry platforms (including Vercel and Google AI Studio) rely heavily on Tailwind and support its ecosystem [3]. The technology is too critical to modern front-end infrastructure to disappear.

### Radix UI primitives stability
While development has slowed post-acquisition, Radix released unified package configurations in February 2026 and new composition APIs in June 2026 [4, 5, 6]. Furthermore, headless primitives are low-level layout structures (like concrete foundations). Stability and a slower update cadence ("boring technology") are advantages, not indicators of a dead project.

### The "eject" capability
With a traditional compiled UI library (like Material UI or Ant Design), you are locked into a `node_modules` dependency. If the maintainers abandon the library, you cannot easily patch bugs or update React versions without rewriting your wrappers.

Under Shadcn's model, **you own the component source files**. The code resides directly in your repository. 
*   If Radix UI were to stop publishing tomorrow, your UI code continues to work exactly as-is.
*   If you need to replace a specific broken primitive (e.g. swapping a dropdown behavior), you can refactor just that local file to use another headless library (such as React Aria or Ark UI) without touching the layout styles or components across the rest of the application [7, 8].

---

## References

*   [1] [Tailwind Financial Assessment (Schwarzmüller)](https://www.linkedin.com/posts/maximilian-schwarzmueller_tailwind-is-facing-huge-financial-problems-activity-7414993823124062208-2AGa)
*   [2] [AI Funnels and Developer Doc Monetization (Talukdar)](https://medium.com/@aayan.talukdar/tailwind-css-lost-80-revenue-while-usage-hit-all-time-highs-ai-did-this-a0756345f2f3)
*   [3] [Infrastructure Support Shifts (Paddo.dev)](https://paddo.dev/blog/tailwind-dead-internet/)
*   [4] [Shadcn UI Primitives Status Review (Mashuk Tamim)](https://mashuktamim.medium.com/is-your-shadcn-ui-project-at-risk-a-deep-dive-into-radixs-future-91af267c4bec)
*   [5] [Radix UI primitives Releases Index](https://www.radix-ui.com/primitives/docs/overview/releases)
*   [6] [Shadcn UI Changelog Records](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
*   [7] [Shadcn UI Case Study & Production Diffs (SISL)](https://sisl.pl/en/blog/shadcn-ui-production-pros-cons-year)
*   [8] [Headless UI Migration Strategies (ShadcnDeck)](https://www.shadcndeck.com/blog/rise-of-shadcn-ui-2026)
