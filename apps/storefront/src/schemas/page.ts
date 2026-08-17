import { z } from 'zod';
import { LandingTemplateSchema } from '../templates/LandingTemplate/LandingTemplate';
import { MerchantTemplateSchema } from '../templates/MerchantTemplate/MerchantTemplate';

// Discriminated union based on the "template" property to support layout-specific validations
export const PageSchema = z.discriminatedUnion('template', [
  LandingTemplateSchema,
  MerchantTemplateSchema,
]);

export type BlenderPage = z.infer<typeof PageSchema>;
