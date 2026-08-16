# Block Cardinality and Layout Constraints

In a page-builder system, **block cardinality** refers to enforcing rules about which blocks can be placed on a page, how many of them can exist, and where they can be positioned.

Traditional content management systems struggle with this, often allowing editors to accidentally break designs (e.g., placing two Hero banners or putting a newsletter signup block at the very top of a page). 

Because Blender Next uses **Zod** as its schema engine, we can enforce strict cardinality rules using standard TypeScript validators.

---

## 1. Enforcing Quantity Limits (e.g. Max 1 Hero, Max 2 Grids)

You can write custom Zod `.refine()` rules to enforce that a specific block type can only appear a set number of times:

```typescript
import { z } from 'zod';
import { HeroSchema, TextSchema, ProductGridSchema } from './schemas';

const BlockSchema = z.union([
  z.object({ type: z.literal('Hero'), data: HeroSchema }),
  z.object({ type: z.literal('Text'), data: TextSchema }),
  z.object({ type: z.literal('ProductGrid'), data: ProductGridSchema }),
]);

export const PageSchema = z.object({
  title: z.string(),
  blocks: z.array(BlockSchema)
    // Rule: At most one Hero banner per page
    .refine(
      (blocks) => {
        const heroCount = blocks.filter((b) => b.type === 'Hero').length;
        return heroCount <= 1;
      },
      { message: "A page layout can contain at most one Hero block." }
    )
    // Rule: Must have at least one block to render
    .refine(
      (blocks) => blocks.length >= 1,
      { message: "The page must contain at least one content block." }
    ),
});
```

---

## 2. Enforcing Positional Rules (e.g. Hero must be first)

To ensure that editors cannot place structural items (like a Hero banner) below a footer or product grid, we write index-based positional checks:

```typescript
export const PageSchema = z.object({
  title: z.string(),
  blocks: z.array(BlockSchema).refine(
    (blocks) => {
      const heroIndex = blocks.findIndex((b) => b.type === 'Hero');
      // The Hero is either not present (-1) or it is the very first block (index 0)
      return heroIndex === -1 || heroIndex === 0;
    },
    { message: "Hero Banner must be positioned at the top of the page layout." }
  ),
});
```

---

## 3. Structural Constraints (Fixed Templates)

If you want a page to have a strict, non-customizable sequence of layout modules (e.g. exactly one hero section at the top, a list of middle text blocks, and exactly one shoppable grid at the bottom), you can model the schema **structurally** instead of as a dynamic array:

```typescript
export const CampaignPageSchema = z.object({
  title: z.string(),
  
  // Positional and quantity slots are defined explicitly as object properties
  hero: HeroSchema.optional(), // Exactly 0 or 1, always at the top
  
  bodyContent: z.array(TextSchema).max(5), // Dynamic array of text blocks in the middle
  
  featuredProducts: ProductGridSchema, // Exactly 1, always at the bottom
});
```

*   **Editor Experience**: Blender Next reads this schema shape and locks the layout structure in the editor panel. Editors can modify the contents of the Hero or add up to 5 body blocks, but they **cannot** reorder the Hero below the products, preserving the design system's integrity perfectly.
