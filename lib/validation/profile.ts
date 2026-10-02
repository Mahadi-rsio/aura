import { z } from 'zod'

export const profileAccents = ['01', '02', '03', '04', '05', '06'] as const

const objectKey = z
  .string()
  .trim()
  .max(300, 'That portrait key is too long')
  .regex(/^posts\/[A-Za-z0-9/_.-]+$/, 'That portrait key is not an archive object')

export const profileLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Every link needs a label')
    .max(40, 'Labels must be 40 characters or fewer')
    .regex(/^[\w .&+-]+$/, 'Labels may use letters, numbers, spaces and . & + -'),
  url: z
    .string()
    .trim()
    .min(1, 'Every link needs an address')
    .max(300, 'Addresses must be 300 characters or fewer')
    .refine(
      (value) => /^(https?:\/\/|mailto:)\S+$/i.test(value),
      'Addresses must start with http://, https://, or mailto:',
    ),
})

export const updateProfileSchema = z
  .object({
    role: z.string().trim().max(80, 'Role must be 80 characters or fewer'),
    location: z.string().trim().max(120, 'Location must be 120 characters or fewer'),
    statement: z.string().trim().max(280, 'Statement must be 280 characters or fewer'),
    bio: z.string().trim().max(4000, 'Bio must be 4000 characters or fewer'),
    accent: z.enum(profileAccents, { message: 'Choose an accent from 01 to 06' }),
    tags: z
      .array(z.string().trim().min(1).max(32, 'Tags must be 32 characters or fewer'))
      .max(12, 'At most 12 tags')
      .default([]),
    links: z.array(profileLinkSchema).max(8, 'At most 8 links').default([]),
    imageKey: objectKey.nullable(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.links.forEach((link, index) => {
      const key = link.label.toLowerCase()
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['links', index, 'label'], message: 'Two links cannot share a label' })
      }
      seen.add(key)
    })
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
