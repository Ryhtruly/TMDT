import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ShopLayout from './components/layout/ShopLayout';
import Dashboard from './pages/shop/Dashboard';
import Stores from './pages/shop/Stores';
import Wallet from './pages/shop/Wallet';
import Orders from './pages/shop/Orders';
import CreateOrder from './pages/shop/CreateOrder';
import Support from './pages/shop/Support';

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
      
      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Shop Protected Pages */}
      <Route element={<ShopLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/create" element={<CreateOrder />} />
        <Route path="/support" element={<Support />} />
      </Route>
    </Routes>
  );
}

export default App;
