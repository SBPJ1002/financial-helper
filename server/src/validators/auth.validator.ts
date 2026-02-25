import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(5).max(100)
    .refine(val => val.trim().split(/\s+/).length >= 2, { message: 'Full name must have at least 2 words' })
    .refine(val => /^[a-zA-ZÀ-ÿ\s]+$/.test(val), { message: 'Name can only contain letters and spaces' }),
  email: z.string().email(),
  password: z.string().min(8).max(100)
    .refine(val => /[A-Z]/.test(val), { message: 'Password must contain at least 1 uppercase letter' })
    .refine(val => /[0-9]/.test(val), { message: 'Password must contain at least 1 number' })
    .refine(val => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), { message: 'Password must contain at least 1 special character' }),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  zipCode: z.string().optional(),
  street: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
