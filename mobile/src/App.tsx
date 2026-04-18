import { Routes, Route, Navigate } from 'react-router-dom';
import ShipperLayout from './components/layout/ShipperLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Scanner from './pages/Scanner';
import CODReconciliation from './pages/CODReconciliation';
import Income from './pages/Income';
import Profile from './pages/Profile';
import StockkeeperLayout from './components/layout/StockkeeperLayout';
import Inventory from './pages/stockkeeper/Inventory';
import WarehouseScanner from './pages/stockkeeper/WarehouseScanner';

function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Shipper Protected Pages */}
      <Route element={<ShipperLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/scan" element={<Scanner />} />
        <Route path="/cod" element={<CODReconciliation />} />
        <Route path="/income" element={<Income />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Stockkeeper Protected Pages */}
      <Route element={<StockkeeperLayout />}>
        <Route path="/stock/inventory" element={<Inventory />} />
        <Route path="/stock/inbound" element={<WarehouseScanner />} />
        <Route path="/stock/outbound" element={<WarehouseScanner />} />
        <Route path="/stock/profile" element={<Profile />} />
      </Route>

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
