import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FrontOffice from './pages/FrontOffice'
import OPD from './pages/OPD'
import Billing from './pages/Billing'
import Admin from './pages/Admin'
import Pharmacy from './pages/Pharmacy'
import IPD from './pages/IPD'
import Appointments from './pages/Appointments'
import Reports from './pages/Reports'

function Guard({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard><Layout /></Guard>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/front-office" element={<Guard roles={['reception','nurse','admin']}><FrontOffice /></Guard>} />
          <Route path="/appointments" element={<Guard roles={['reception','doctor','nurse','admin']}><Appointments /></Guard>} />
          <Route path="/opd" element={<Guard roles={['doctor','nurse','admin']}><OPD /></Guard>} />
          <Route path="/ipd" element={<Guard roles={['doctor','nurse','admin','reception']}><IPD /></Guard>} />
          <Route path="/pharmacy" element={<Guard roles={['pharmacist','admin']}><Pharmacy /></Guard>} />
          <Route path="/billing" element={<Guard roles={['billing','admin']}><Billing /></Guard>} />
          <Route path="/reports" element={<Guard roles={['admin','billing']}><Reports /></Guard>} />
          <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
