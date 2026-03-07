import { z } from 'zod';

export const ServiceRequestCreateSchema = z.object({
  recipient_id: z.string().uuid(),
  category_id: z.string().uuid(),
  preferred_date: z.string().datetime(),
  preferred_time_slot: z.enum(['morning', 'afternoon', 'evening']).optional(),
  location: z.string().min(1, '服務地點為必填').max(500),
  description: z.string().min(1, '需求描述為必填'),
});

export const ServiceRequestStatusUpdateSchema = z.object({
  status: z.enum(['contacted', 'arranged', 'completed', 'cancelled']),
  admin_note: z.string().optional(),
});

export const ServiceRequestAssignSchema = z.object({
  provider_id: z.string().uuid(),
});

export type ServiceRequestCreateInput = z.infer<typeof ServiceRequestCreateSchema>;
export type ServiceRequestStatusUpdate = z.infer<typeof ServiceRequestStatusUpdateSchema>;
export type ServiceRequestAssignInput = z.infer<typeof ServiceRequestAssignSchema>;
