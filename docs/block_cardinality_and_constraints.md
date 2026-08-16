# Block cardinality and layout constraints

In a page-builder, "block cardinality" simply means controlling which blocks can go where on a page, and how many of them are allowed.

Most database-backed CMS platforms struggle with this, letting editors accidentally break layout designs (like putting a newsletter sign-up block at the very top of a homepage or stack two heroes). 

Since Blender Next uses Zod as its schema validator, we can enforce strict placement and quantity rules directly in our code.

---

## 1. Enforcing quantity limits (e.g. Max 1 Hero, Max 2 Grids)

We can write custom Zod `.refine()` rules to enforce that a specific block type only appears a set number of times:

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

## 2. Enforcing positional rules (e.g. Hero must be first)

To ensure editors cannot drag hero banners below product lists or footers, we write index-based positional checks:

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

## 3. Structural constraints (Fixed templates)

If you want a page to have a strict, non-customizable sequence of layout modules (e.g. exactly one hero section at the top, a body text blocks array in the middle, and exactly one shoppable grid at the bottom), you can model the schema **structurally** instead of as a dynamic array:

```typescript
export const CampaignPageSchema = z.object({
  title: z.string(),
  
  // Positional and quantity slots are defined explicitly as object properties
  hero: HeroSchema.optional(), // Exactly 0 or 1, always at the top
  
  bodyContent: z.array(TextSchema).max(5), // Dynamic array of text blocks in the middle
  
  featuredProducts: ProductGridSchema, // Exactly 1, always at the bottom
});
```

Blender Next reads this schema shape and locks the layout structure in the editor panel. Editors can modify the contents of the Hero or add up to 5 body blocks, but they cannot reorder the Hero below the products, preserving the design system's integrity perfectly.
