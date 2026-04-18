import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/public/LandingPage';
import TrackOrder from './pages/public/TrackOrder';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ShopLayout from './components/layout/ShopLayout';
import Dashboard from './pages/shop/Dashboard';
import Stores from './pages/shop/Stores';
import Wallet from './pages/shop/Wallet';
import Orders from './pages/shop/Orders';
import OrderDetail from './pages/shop/OrderDetail';
import CreateOrder from './pages/shop/CreateOrder';
import Support from './pages/shop/Support';

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/track/:code" element={<TrackOrder />} />
      </Route>

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Shop Protected Pages — cần đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ShopLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/support" element={<Support />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
