import { z } from 'zod'

export const presignRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(180, 'Filename is too long')
    .transform((value) => value.split(/[\\/]/).pop() ?? value),
  contentType: z
    .string()
    .min(1, 'Content type is required')
    .refine((value) => value.toLowerCase().startsWith('image/'), 'Only image uploads are supported'),
  size: z.number().int().positive().max(10_485_760, 'Images must be smaller than 10MB'),
})

export const completeUploadSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(300, 'Key is too long')
    .refine((value) => value.startsWith('posts/'), 'Key must be a posts/ object'),
  contentType: z
    .string()
    .min(1, 'Content type is required')
    .refine((value) => value.toLowerCase().startsWith('image/'), 'Only image uploads are supported'),
  size: z.number().int().nonnegative().max(10_485_760, 'Images must be smaller than 10MB'),
  altText: z.string().max(300, 'Alt text is too long').optional(),
})

export type PresignRequest = z.infer<typeof presignRequestSchema>
export type CompleteUploadRequest = z.infer<typeof completeUploadSchema>