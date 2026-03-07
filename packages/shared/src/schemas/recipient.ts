import { z } from 'zod';

export const RecipientCreateSchema = z.object({
  name: z.string().min(1, '姓名為必填').max(100, '姓名不得超過 100 字'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  medical_tags: z.array(z.string()).max(20, '疾病標籤最多 20 個').default([]),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
  notes: z.string().optional(),
});

export const RecipientUpdateSchema = RecipientCreateSchema.partial();

export type RecipientCreateInput = z.infer<typeof RecipientCreateSchema>;
export type RecipientUpdateInput = z.infer<typeof RecipientUpdateSchema>;
