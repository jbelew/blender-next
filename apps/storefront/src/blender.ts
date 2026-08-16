import { defineCollection } from '@blender-next/core';
import { PageSchema } from './schemas/page';

export const PagesCollection = defineCollection({
  name: 'pages',
  path: 'content/pages',
  schema: PageSchema,
});

export type { BlenderPage } from './schemas/page';
