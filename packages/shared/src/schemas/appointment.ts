import { z } from 'zod';

export const AppointmentCreateSchema = z.object({
  recipient_id: z.string().uuid(),
  title: z.string().min(1, '標題為必填').max(200, '標題不得超過 200 字'),
  hospital_name: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  doctor_name: z.string().max(100).optional(),
  appointment_date: z.string().refine((s) => !isNaN(Date.parse(s)), '日期格式不正確'),
  note: z.string().max(500).optional(),
});

export const AppointmentUpdateSchema = AppointmentCreateSchema.omit({ recipient_id: true }).partial();

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>;
