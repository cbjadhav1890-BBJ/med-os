import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FrontOffice from './pages/FrontOffice'
import OPD from './pages/OPD'
import Billing from './pages/Billing'
import Admin from './pages/Admin'

function Guard({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="front-office" element={<Guard roles={['reception','admin','nurse']}><FrontOffice /></Guard>} />
          <Route path="opd" element={<Guard roles={['doctor','nurse','admin']}><OPD /></Guard>} />
          <Route path="billing" element={<Guard roles={['billing','admin']}><Billing /></Guard>} />
          <Route path="admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
