import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
