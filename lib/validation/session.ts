import { z } from 'zod'

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required').max(200, 'Password is too long'),
})

export const adminContentSchema = z.object({
  section: z.string().trim().min(1, 'Section is required').max(80, 'Section is too long'),
  content: z.record(z.string(), z.unknown(), { message: 'Content must be an object' }),
})

export const adminUploadSchema = z.object({
  section: z
    .string()
    .max(80)
    .optional()
    .transform((value) => (value ? value.replace(/[^a-z0-9-]/gi, '-').toLowerCase() : 'archive')),
})