import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import NavigBar from './components/NavigBar'
import UserProfile from './components/UserProfile'
import ProtectedRoute from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const MainDictionary = lazy(() => import('./pages/MainDictionary'))
const InnerD = lazy(() => import('./pages/InnerD'))
const Practice = lazy(() => import('./pages/Practice'))
const WordDetails = lazy(() => import('./pages/WordDetails'))
const Account = lazy(() => import('./pages/Account'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Friends = lazy(() => import('./pages/Friends'))
const DuelArena = lazy(() => import('./pages/DuelArena'))

function App() {
  return (
    <>
      <NavigBar />
      <UserProfile />

      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/account" element={<Account />} />

          <Route
            path="/mainDictionary"
            element={
              <ProtectedRoute>
                <MainDictionary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/InnerD/:id"
            element={
              <ProtectedRoute>
                <InnerD />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <Practice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/:id"
            element={
              <ProtectedRoute>
                <Practice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/WordDetails/:id"
            element={
              <ProtectedRoute>
                <WordDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/duel/:roomId"
            element={
              <ProtectedRoute>
                <DuelArena />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  )
}

export default App


