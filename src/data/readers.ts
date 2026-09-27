import type { LibraryEntry, Reader } from '../types'

// Fictional demo readers for the publisher panel.
export const readers: Reader[] = [
  { id: 'r1', name: 'Ananya Rao', email: 'ananya.rao@example.com', inLibrary: 14, completed: 9, joinedAt: '2025-02-14', status: 'Active', favoriteCategory: 'Programming' },
  { id: 'r2', name: 'James Cooper', email: 'james.cooper@example.com', inLibrary: 8, completed: 5, joinedAt: '2025-06-03', status: 'Active', favoriteCategory: 'Business' },
  { id: 'r3', name: 'Meera Iyer', email: 'meera.iyer@example.com', inLibrary: 22, completed: 17, joinedAt: '2024-11-21', status: 'Active', favoriteCategory: 'Fiction' },
  { id: 'r4', name: 'Lucas Martin', email: 'lucas.martin@example.com', inLibrary: 3, completed: 0, joinedAt: '2026-09-12', status: 'New', favoriteCategory: 'Artificial Intelligence' },
  { id: 'r5', name: 'Fatima Khan', email: 'fatima.khan@example.com', inLibrary: 11, completed: 6, joinedAt: '2025-08-30', status: 'Active', favoriteCategory: 'Self Development' },
  { id: 'r6', name: 'Noah Schmidt', email: 'noah.schmidt@example.com', inLibrary: 6, completed: 2, joinedAt: '2025-01-09', status: 'Inactive', favoriteCategory: 'Science' },
  { id: 'r7', name: 'Aisha Bello', email: 'aisha.bello@example.com', inLibrary: 17, completed: 12, joinedAt: '2024-07-17', status: 'Active', favoriteCategory: 'Design' },
  { id: 'r8', name: 'Rohan Das', email: 'rohan.das@example.com', inLibrary: 5, completed: 1, joinedAt: '2026-08-28', status: 'New', favoriteCategory: 'Finance' },
  { id: 'r9', name: 'Chloe Nguyen', email: 'chloe.nguyen@example.com', inLibrary: 9, completed: 7, joinedAt: '2025-04-02', status: 'Active', favoriteCategory: 'Education' },
  { id: 'r10', name: 'Ethan Park', email: 'ethan.park@example.com', inLibrary: 2, completed: 0, joinedAt: '2025-03-19', status: 'Inactive', favoriteCategory: 'Entrepreneurship' },
  { id: 'r11', name: 'Sara Lindqvist', email: 'sara.lindqvist@example.com', inLibrary: 13, completed: 10, joinedAt: '2024-12-05', status: 'Active', favoriteCategory: 'History' },
  { id: 'r12', name: 'Vikram Joshi', email: 'vikram.joshi@example.com', inLibrary: 7, completed: 3, joinedAt: '2026-09-20', status: 'New', favoriteCategory: 'Technology' },
  { id: 'r13', name: 'Grace Okafor', email: 'grace.okafor@example.com', inLibrary: 19, completed: 14, joinedAt: '2024-05-26', status: 'Active', favoriteCategory: 'Programming' },
  { id: 'r14', name: 'Tomás Silva', email: 'tomas.silva@example.com', inLibrary: 4, completed: 1, joinedAt: '2025-10-10', status: 'Inactive', favoriteCategory: 'Fiction' },
]

/** Demo purchases for the sample member account (maya@bookera.demo). */
export const DEMO_MEMBER_EMAIL = 'maya@bookera.demo'
export const seedLibrary: LibraryEntry[] = [
  { bookId: 'modern-javascript-development', addedAt: '2026-09-18', progress: 64, lastPage: 9, orderId: 'BKR-240918-JS7Q', amount: 399 },
  { bookId: 'ai-and-the-future-of-technology', addedAt: '2026-09-10', progress: 28, lastPage: 4, orderId: 'BKR-240910-AI2M', amount: 449 },
  { bookId: 'the-lantern-house', addedAt: '2026-08-29', progress: 82, lastPage: 12, orderId: 'BKR-240829-LH4K', amount: 299 },
  { bookId: 'the-learning-code', addedAt: '2026-08-12', progress: 100, lastPage: 14, orderId: 'BKR-240812-FREE', amount: 0 },
  { bookId: 'deep-focus', addedAt: '2026-07-30', progress: 100, lastPage: 14, orderId: 'BKR-240730-DF9R', amount: 249 },
  { bookId: 'interface-systems', addedAt: '2026-09-22', progress: 0, orderId: 'BKR-240922-IS3T', amount: 449 },
]

// Publisher analytics (demo data)
export const readsOverTime = [
  { label: 'Oct', value: 8200 },
  { label: 'Nov', value: 9100 },
  { label: 'Dec', value: 11800 },
  { label: 'Jan', value: 10900 },
  { label: 'Feb', value: 12600 },
  { label: 'Mar', value: 14200 },
  { label: 'Apr', value: 13700 },
  { label: 'May', value: 16100 },
  { label: 'Jun', value: 17400 },
  { label: 'Jul', value: 16900 },
  { label: 'Aug', value: 19800 },
  { label: 'Sep', value: 22300 },
]

export const readerGrowth = [
  { label: 'Apr', value: 1240 },
  { label: 'May', value: 1580 },
  { label: 'Jun', value: 1710 },
  { label: 'Jul', value: 2050 },
  { label: 'Aug', value: 2390 },
  { label: 'Sep', value: 2860 },
]
