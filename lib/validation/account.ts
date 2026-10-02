import { z } from 'zod'

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, 'A name is required').max(80, 'Name must be 80 characters or fewer'),
})

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
