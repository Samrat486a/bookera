import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext'
import { ToastProvider } from './context/ToastContext'
import { AdminLayout, ScrollManager, SiteLayout } from './components/layout/Layouts'
import { About, Categories, Home, NotFound } from './pages/PublicPages'
import Publish from './pages/Publish'
import Checkout, { CheckoutSuccess } from './pages/Checkout'
import Ebooks from './pages/Ebooks'
import EbookDetails from './pages/EbookDetails'
import { Login, ResetPassword, Signup } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Overview from './pages/admin/Overview'
import ManageBooks from './pages/admin/ManageBooks'
import BookForm from './pages/admin/BookForm'
import Readers from './pages/admin/Readers'

// The PDF reader pulls in pdf.js, so it's loaded only when a member opens a book.
const Reader = lazy(() => import('./pages/Reader'))

function ReaderFallback() {
  return <div className="fixed inset-0 grid place-items-center bg-paper-2 text-sm text-muted">Opening your book…</div>
}

/** Remount the form when switching between "new" and a specific book. */
function BookFormRoute() {
  const { id } = useParams()
  return <BookForm key={id ?? 'new'} />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollManager />
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="ebooks" element={<Ebooks />} />
              <Route path="ebooks/:id" element={<EbookDetails />} />
              <Route path="categories" element={<Categories />} />
              <Route path="publish" element={<Publish />} />
              <Route path="checkout/success" element={<CheckoutSuccess />} />
              <Route path="checkout/:bookId" element={<Checkout />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route
              path="read/:bookId"
              element={
                <Suspense fallback={<ReaderFallback />}>
                  <Reader />
                </Suspense>
              }
            />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="books" element={<ManageBooks />} />
              <Route path="books/new" element={<BookFormRoute />} />
              <Route path="books/:id/edit" element={<BookFormRoute />} />
              <Route path="readers" element={<Readers />} />
              <Route path="profile" element={<Profile inAdmin />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
