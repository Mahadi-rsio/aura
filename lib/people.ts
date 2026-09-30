export type Person = {
  slug: string
  name: string
  role: string
  location: string
  statement: string
  image: string
  accent: string
  tags: string[]
  views: string
  stars: string
  shares: string
}

export type FeedPost = {
  id: string
  type: 'feeling' | 'memory' | 'achievement' | 'mood' | 'album'
  images?: string[]
  author: string
  authorSlug: string
  image: string
  eyebrow: string
  title: string
  body: string
  date: string
  views: string
  stars: string
  shares: string
}

export const people: Person[] = [
  { slug: 'alexandra-noir', name: 'Alexandra Noir', role: 'Story collector', location: 'North Atlantic', statement: 'I collect the quiet things — light on a wall, a voice remembered, the distance between who we were and who we are becoming.', image: '/images/hero-cover.png', accent: '01', tags: ['memory', 'image', 'writing'], views: '4.8k', stars: '3k', shares: '898' },
  { slug: 'mira-sato', name: 'Mira Sato', role: 'Architect of stillness', location: 'Tokyo / 35° N', statement: 'The spaces we return to become part of our inner weather.', image: '/images/memory-city.png', accent: '02', tags: ['space', 'ritual', 'light'], views: '12k', stars: '4m', shares: '3.2k' },
  { slug: 'elias-vale', name: 'Elias Vale', role: 'Field recorder', location: 'Lisbon / 38° N', statement: 'Every city has a frequency. I spend my days learning how to hear it.', image: '/images/memory-coast.png', accent: '03', tags: ['sound', 'travel', 'archive'], views: '898', stars: '2.4k', shares: '421' },
  { slug: 'noor-khan', name: 'Noor Khan', role: 'Image maker', location: 'East London', statement: 'A photograph is a small room where time agrees to stay.', image: '/images/memory-studio.png', accent: '04', tags: ['portrait', 'film', 'process'], views: '6.2k', stars: '18k', shares: '1.1k' },
  { slug: 'theo-march', name: 'Theo March', role: 'Keeper of afterthoughts', location: 'Milan / 45° N', statement: 'I am interested in the pause after the moment, when meaning starts to arrive.', image: '/images/portrait.png', accent: '05', tags: ['notes', 'fashion', 'presence'], views: '3.1k', stars: '7.8k', shares: '898' },
]

export const feedPosts: FeedPost[] = [
  { id: 'feeling-01', type: 'feeling', author: 'Alexandra Noir', authorSlug: 'alexandra-noir', image: '/images/hero-cover.png', eyebrow: 'Feeling / 06:42', title: 'A little more open today.', body: 'Some mornings arrive without asking for anything. I am learning to let them.', date: 'Today', views: '4.8k', stars: '3k', shares: '898' },
  { id: 'memory-01', type: 'memory', author: 'Mira Sato', authorSlug: 'mira-sato', image: '/images/memory-city.png', eyebrow: 'Memory / Tokyo', title: 'After the rain', body: 'The city kept its reflections long after everyone had gone home.', date: '03.2022', views: '12k', stars: '4m', shares: '3.2k' },
  { id: 'achievement-01', type: 'achievement', author: 'Noor Khan', authorSlug: 'noor-khan', image: '/images/memory-studio.png', eyebrow: 'Achievement / 04.2026', title: 'A quiet milestone.', body: 'The first edition of my image archive is now in the hands of 200 people.', date: '04.2026', views: '6.2k', stars: '18k', shares: '1.1k' },
  { id: 'mood-01', type: 'mood', author: 'Elias Vale', authorSlug: 'elias-vale', image: '/images/memory-coast.png', eyebrow: 'Mood / North Atlantic', title: 'Blue hour, extended.', body: 'No destination today. Just the long way around.', date: '08.2014', views: '898', stars: '2.4k', shares: '421' },
  { id: 'album-01', type: 'album', author: 'Theo March', authorSlug: 'theo-march', image: '/images/portrait.png', images: ['/images/portrait.png', '/images/memory-studio.png', '/images/memory-city.png', '/images/memory-coast.png'], eyebrow: 'Album / four fragments', title: 'Rooms I remember', body: 'A small collection of places that stayed with me after I left.', date: '09.2026', views: '3.1k', stars: '7.8k', shares: '898' },
]

export function getPerson(slug: string) {
  return people.find((person) => person.slug === slug)
}

export const profileMemories = [
  { image: '/images/memory-coast.png', date: '08.2014', place: 'North Atlantic', title: 'Where the world went quiet', story: 'A long walk at the edge of the map. The wind did most of the talking.' },
  { image: '/images/memory-studio.png', date: '11.2018', place: 'East London', title: 'The room with good light', story: 'A borrowed studio, an unfinished idea, and the first time the work felt like mine.' },
  { image: '/images/memory-city.png', date: '03.2022', place: 'Tokyo, Japan', title: 'After the rain', story: 'A city in reflection. Everyone moving, briefly illuminated.' },
]
export const profileGallery = ['/images/portrait.png', '/images/hero-cover.png', '/images/memory-studio.png', '/images/memory-city.png', '/images/memory-coast.png']
