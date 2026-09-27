import type { Author } from '../types'

// Fictional demo authors.
export const authors: Author[] = [
  {
    id: 'alex-morgan',
    name: 'Alex Morgan',
    specialization: 'Software Engineer & Author',
    bio: 'Writing about modern software development and emerging technologies.',
    books: 12,
    city: 'Bengaluru',
    followers: 18400,
    tone: '#3654FF',
  },
  {
    id: 'sophia-williams',
    name: 'Sophia Williams',
    specialization: 'Brand Strategist',
    bio: 'Helping creators and founders build brands people remember and trust.',
    books: 7,
    city: 'London',
    followers: 12900,
    tone: '#FF5D5D',
  },
  {
    id: 'daniel-carter',
    name: 'Daniel Carter',
    specialization: 'AI Researcher',
    bio: 'Explaining machine learning and the future of intelligent systems in plain language.',
    books: 9,
    city: 'Toronto',
    followers: 21300,
    tone: '#14171B',
  },
  {
    id: 'michael-brown',
    name: 'Michael Brown',
    specialization: 'Investor & Finance Educator',
    bio: 'Making personal finance and long-term investing approachable for everyone.',
    books: 6,
    city: 'New York',
    followers: 9800,
    tone: '#1F8A5B',
  },
  {
    id: 'emma-wilson',
    name: 'Emma Wilson',
    specialization: 'Novelist',
    bio: 'Writing quiet, character-driven fiction about cities, memory, and second chances.',
    books: 5,
    city: 'Dublin',
    followers: 15600,
    tone: '#FFAE1F',
  },
  {
    id: 'ryan-thomas',
    name: 'Ryan Thomas',
    specialization: 'Product Designer',
    bio: 'Sharing practical systems for interface design, typography, and product thinking.',
    books: 8,
    city: 'Berlin',
    followers: 11200,
    tone: '#7A5AF8',
  },
  {
    id: 'priya-nair',
    name: 'Priya Nair',
    specialization: 'Educator & Learning Scientist',
    bio: 'Researching how people learn — and turning that research into better study habits.',
    books: 4,
    city: 'Kochi',
    followers: 7400,
    tone: '#0E7C7B',
  },
  {
    id: 'kenji-watanabe',
    name: 'Kenji Watanabe',
    specialization: 'Physicist & Science Writer',
    bio: 'Making the universe feel a little less distant, one chapter at a time.',
    books: 6,
    city: 'Kyoto',
    followers: 8900,
    tone: '#2440E6',
  },
  {
    id: 'lena-fischer',
    name: 'Lena Fischer',
    specialization: 'Historian',
    bio: 'Telling the stories of trade, technology, and the ideas that shaped our world.',
    books: 5,
    city: 'Vienna',
    followers: 6100,
    tone: '#9A5D00',
  },
  {
    id: 'arjun-mehta',
    name: 'Arjun Mehta',
    specialization: 'Founder & Startup Mentor',
    bio: 'Two-time founder writing honest playbooks for early-stage builders.',
    books: 3,
    city: 'Mumbai',
    followers: 10300,
    tone: '#C62F2F',
  },
]

export const getAuthor = (id: string) => authors.find((a) => a.id === id)

/**
 * With the live catalogue, the list above is replaced by the authors stored in
 * MySQL (see StoreContext). Components keep calling getAuthor() unchanged.
 */
export function replaceAuthors(next: Author[]) {
  authors.splice(0, authors.length, ...next)
}
