import { z } from 'zod';
import { LandingTemplateSchema } from '../templates/LandingTemplate/LandingTemplate';
import { BlogTemplateSchema } from '../templates/BlogTemplate/BlogTemplate';

// Discriminated union based on the "template" property to support layout-specific validations
export const PageSchema = z.discriminatedUnion('template', [
  LandingTemplateSchema,
  BlogTemplateSchema,
]);

export type BlenderPage = z.infer<typeof PageSchema>;
