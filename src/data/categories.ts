import type { Category } from '../types'

export const categories: Category[] = [
  { name: 'Programming', slug: 'programming', tone: '#3654FF', description: 'Learn programming, software development, frameworks, and modern technologies.' },
  { name: 'Artificial Intelligence', slug: 'artificial-intelligence', tone: '#14171B', description: 'Machine learning, generative AI, and the ideas shaping intelligent systems.' },
  { name: 'Technology', slug: 'technology', tone: '#2440E6', description: 'The products, platforms, and trends changing how we live and work.' },
  { name: 'Business', slug: 'business', tone: '#FF5D5D', description: 'Strategy, marketing, leadership, and the craft of building great companies.' },
  { name: 'Education', slug: 'education', tone: '#0E7C7B', description: 'Study skills, learning science, and guides for students and teachers.' },
  { name: 'Self Development', slug: 'self-development', tone: '#FFAE1F', description: 'Habits, focus, and mindset for a more intentional life.' },
  { name: 'Fiction', slug: 'fiction', tone: '#7A5AF8', description: 'Novels and stories that move, surprise, and stay with you.' },
  { name: 'Science', slug: 'science', tone: '#1F8A5B', description: 'Physics, biology, and space — explained with clarity and wonder.' },
  { name: 'Finance', slug: 'finance', tone: '#9A5D00', description: 'Personal finance, investing, and money skills that compound.' },
  { name: 'Design', slug: 'design', tone: '#C62F2F', description: 'Interface design, typography, and product thinking for makers.' },
  { name: 'History', slug: 'history', tone: '#5B4636', description: 'The people, places, and turning points that shaped our world.' },
  { name: 'Entrepreneurship', slug: 'entrepreneurship', tone: '#14171B', description: 'Playbooks for founders — from first idea to first thousand customers.' },
]

/** With the live catalogue, replaced by the categories stored in MySQL (see StoreContext). */
export function replaceCategories(next: Category[]) {
  categories.splice(0, categories.length, ...next)
}

export const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug)
export const getCategoryByName = (name: string) => categories.find((c) => c.name === name)
