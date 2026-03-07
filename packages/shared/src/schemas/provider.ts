import { z } from 'zod';

export const ProviderCreateSchema = z.object({
  name: z.string().min(1, '姓名為必填').max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  specialties: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  experience_years: z.number().int().min(0).optional(),
  service_areas: z.array(z.string()).default([]),
});

export const ProviderUpdateSchema = ProviderCreateSchema.partial();

export const ProviderReviewSchema = z.object({
  review_status: z.enum(['approved', 'suspended']),
  admin_note: z.string().optional(),
});

export type ProviderCreateInput = z.infer<typeof ProviderCreateSchema>;
export type ProviderUpdateInput = z.infer<typeof ProviderUpdateSchema>;
export type ProviderReviewInput = z.infer<typeof ProviderReviewSchema>;
