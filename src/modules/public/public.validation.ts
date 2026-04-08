import { z } from 'zod';

export const createBookingSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Invalid email format'),
  phoneNumber: z.string().trim().min(7, 'Phone number is required'),
  subject: z.string().trim().min(1, 'Subject is required').max(150, 'Subject is too long'),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message is too long')
});

export const workerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Invalid email format'),
  phone: z.string().trim().min(7, 'Phone number is required')
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type WorkerApplicationInput = z.infer<typeof workerApplicationSchema>;
