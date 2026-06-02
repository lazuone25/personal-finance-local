import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Extra from './pages/Extra'
import Investitii from './pages/Investitii'
import Deposits from './pages/Deposits'
import Transactions from './pages/Transactions'
import Statistici from './pages/Statistici'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/extra" element={<Extra />} />
        <Route path="/investitii" element={<Investitii />} />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/statistici" element={<Statistici />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
