import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import FireCalculator from './pages/FireCalculator'
import FireFlowchart from './pages/FireFlowchart'
import CareerSimulator from './pages/CareerSimulator'
import LandingPage from './pages/LandingPage'
import Profile from './pages/Profile'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Layout is public — individual pages handle their own auth needs */}
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/calculator" replace />} />

          {/* Public: calculator works without an account */}
          <Route path="calculator" element={<FireCalculator />} />
          <Route path="flowchart" element={<FireFlowchart />} />
          <Route path="career" element={<CareerSimulator />} />

          {/* Protected: require sign-in */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/app/calculator" replace />} />
      </Routes>
    </Router>
  )
}
