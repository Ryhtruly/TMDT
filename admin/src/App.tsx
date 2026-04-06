import { Routes, Route } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Infrastructure from './pages/Infrastructure';
import Employees from './pages/Employees';
import Payouts from './pages/Payouts';
import Bags from './pages/Bags';
import Settings from './pages/Settings';
import Promotions from './pages/Promotions';
import CustomerSupport from './pages/CustomerSupport';
import AuditAndSalary from './pages/AuditAndSalary';
import RoutesPage from './pages/Routes';
import Orders from './pages/Orders';
import Shops from './pages/Shops';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="employees" element={<Employees />} />
        <Route path="bags" element={<Bags />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="audit-salary" element={<AuditAndSalary />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="orders" element={<Orders />} />
        <Route path="shops" element={<Shops />} />
      </Route>
    </Routes>
  );
}

export default App;
