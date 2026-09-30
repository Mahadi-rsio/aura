export const postTypes = ['feeling', 'memory', 'achievement', 'mood', 'album', 'quote', 'poem', 'note'] as const

export type PostType = (typeof postTypes)[number]
export type PostKind = 'image' | 'literary'

export type PostTypeSpec = {
  type: PostType
  label: string
  blurb: string
  icon: string
  kind: PostKind
  allowsImages: boolean
  minImages: number
  maxImages: number
  requiredFields: string[]
  fields: string[]
  sortOrder: number
}

const optionalFields = ['place', 'occurredOn', 'tags'] as const

function fieldsFor(type: PostType, required: string[], conditional: string[]): string[] {
  const base = ['title', 'body']
  return type === 'note' ? [...base, ...required, ...optionalFields] : [...base, ...required, ...conditional, ...optionalFields]
}

export const postTypeSpecs: PostTypeSpec[] = [
  {
    type: 'feeling',
    label: 'Feeling',
    blurb: 'A sensation, named plainly.',
    icon: 'Sparkles',
    kind: 'image',
    allowsImages: true,
    minImages: 0,
    maxImages: 1,
    requiredFields: ['moodScore'],
    fields: fieldsFor('feeling', ['moodScore'], []),
    sortOrder: 1,
  },
  {
    type: 'memory',
    label: 'Memory',
    blurb: 'A place you keep returning to.',
    icon: 'MapPin',
    kind: 'image',
    allowsImages: true,
    minImages: 0,
    maxImages: 1,
    requiredFields: [],
    fields: fieldsFor('memory', [], []),
    sortOrder: 2,
  },
  {
    type: 'achievement',
    label: 'Achievement',
    blurb: 'Something you finished.',
    icon: 'Trophy',
    kind: 'image',
    allowsImages: true,
    minImages: 0,
    maxImages: 1,
    requiredFields: [],
    fields: fieldsFor('achievement', [], []),
    sortOrder: 3,
  },
  {
    type: 'mood',
    label: 'Mood',
    blurb: 'The weather inside a day.',
    icon: 'Cloud',
    kind: 'image',
    allowsImages: true,
    minImages: 0,
    maxImages: 1,
    requiredFields: ['moodScore'],
    fields: fieldsFor('mood', ['moodScore'], []),
    sortOrder: 4,
  },
  {
    type: 'album',
    label: 'Album',
    blurb: 'A set of fragments, 2 to 10 frames.',
    icon: 'Images',
    kind: 'image',
    allowsImages: true,
    minImages: 2,
    maxImages: 10,
    requiredFields: ['mediaIds'],
    fields: fieldsFor('album', ['mediaIds'], []),
    sortOrder: 5,
  },
  {
    type: 'quote',
    label: 'Quote',
    blurb: 'A sentence that stays.',
    icon: 'Quote',
    kind: 'literary',
    allowsImages: true,
    minImages: 0,
    maxImages: 1,
    requiredFields: [],
    fields: fieldsFor('quote', [], ['attribution']),
    sortOrder: 6,
  },
  {
    type: 'poem',
    label: 'Poem',
    blurb: 'Lines worth keeping in order.',
    icon: 'Feather',
    kind: 'literary',
    allowsImages: false,
    minImages: 0,
    maxImages: 0,
    requiredFields: [],
    fields: fieldsFor('poem', [], ['attribution']),
    sortOrder: 7,
  },
  {
    type: 'note',
    label: 'Note',
    blurb: 'A few lines from the desk.',
    icon: 'NotebookPen',
    kind: 'literary',
    allowsImages: false,
    minImages: 0,
    maxImages: 0,
    requiredFields: [],
    fields: fieldsFor('note', [], []),
    sortOrder: 8,
  },
]

export const postTypeByName = Object.fromEntries(postTypeSpecs.map((spec) => [spec.type, spec])) as Record<PostType, PostTypeSpec>

export function isPostType(value: unknown): value is PostType {
  return typeof value === 'string' && (postTypes as readonly string[]).includes(value)
}