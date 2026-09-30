export type Person = {
  slug: string
  name: string
  role: string
  location: string
  statement: string
  image: string
  accent: string
  tags: string[]
}

export const people: Person[] = [
  { slug: 'alexandra-noir', name: 'Alexandra Noir', role: 'Story collector', location: 'North Atlantic', statement: 'I collect the quiet things — light on a wall, a voice remembered, the distance between who we were and who we are becoming.', image: '/images/hero-cover.png', accent: '01', tags: ['memory', 'image', 'writing'] },
  { slug: 'mira-sato', name: 'Mira Sato', role: 'Architect of stillness', location: 'Tokyo / 35° N', statement: 'The spaces we return to become part of our inner weather.', image: '/images/memory-city.png', accent: '02', tags: ['space', 'ritual', 'light'] },
  { slug: 'elias-vale', name: 'Elias Vale', role: 'Field recorder', location: 'Lisbon / 38° N', statement: 'Every city has a frequency. I spend my days learning how to hear it.', image: '/images/memory-coast.png', accent: '03', tags: ['sound', 'travel', 'archive'] },
  { slug: 'noor-khan', name: 'Noor Khan', role: 'Image maker', location: 'East London', statement: 'A photograph is a small room where time agrees to stay.', image: '/images/memory-studio.png', accent: '04', tags: ['portrait', 'film', 'process'] },
  { slug: 'theo-march', name: 'Theo March', role: 'Keeper of afterthoughts', location: 'Milan / 45° N', statement: 'I am interested in the pause after the moment, when meaning starts to arrive.', image: '/images/portrait.png', accent: '05', tags: ['notes', 'fashion', 'presence'] },
]

export const currentProfile = people[0]

export function getPerson(slug: string) {
  return people.find((person) => person.slug === slug)
}

export const profileMemories = [
  { image: '/images/memory-coast.png', date: '08.2014', place: 'North Atlantic', title: 'Where the world went quiet', story: 'A long walk at the edge of the map. The wind did most of the talking.' },
  { image: '/images/memory-studio.png', date: '11.2018', place: 'East London', title: 'The room with good light', story: 'A borrowed studio, an unfinished idea, and the first time the work felt like mine.' },
  { image: '/images/memory-city.png', date: '03.2022', place: 'Tokyo, Japan', title: 'After the rain', story: 'A city in reflection. Everyone moving, briefly illuminated.' },
]
export const profileGallery = ['/images/portrait.png', '/images/hero-cover.png', '/images/memory-studio.png', '/images/memory-city.png', '/images/memory-coast.png']
