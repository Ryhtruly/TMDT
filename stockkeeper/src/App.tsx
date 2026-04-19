import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import KioskLayout from './components/layout/KioskLayout';
import ProtectedRoute from './components/ProtectedRoute';

import WarehouseScanner from './pages/stockkeeper/WarehouseScanner';
import Inventory from './pages/stockkeeper/Inventory';
import Bagging from './pages/stockkeeper/Bagging';

const DashboardRedirect = () => {
  return <Navigate to="/inbound" replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<KioskLayout />}>
          <Route index element={<DashboardRedirect />} />
          <Route path="inbound" element={<WarehouseScanner />} />
          <Route path="outbound" element={<WarehouseScanner />} />
          <Route path="bagging" element={<Bagging />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
