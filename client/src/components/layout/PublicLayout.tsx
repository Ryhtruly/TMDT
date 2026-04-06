import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiBox } from 'react-icons/fi';
import './PublicLayout.css';

const PublicLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="container header-container">
          <Link to="/" className="logo-area">
            <FiBox className="logo-icon" />
            <span className="logo-text">GIAO HÀNG SIÊU TỐC</span>
          </Link>
          
          <nav className="main-nav">
            <Link to="/">Tra Cứu</Link>
            <Link to="/services">Dịch Vụ</Link>
            <Link to="/pricing">Bảng Giá</Link>
          </nav>
          
          <div className="header-actions">
            <button className="btn-outline" onClick={() => navigate('/login')}>Đăng Nhập</button>
            <button className="btn-primary" onClick={() => navigate('/register')}>Đăng Ký Shop</button>
          </div>
        </div>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h3 className="footer-title">Về Chúng Tôi</h3>
              <p>Mạng lưới giao hàng nhanh trên toàn quốc, đồng hành cùng nhà bán hàng.</p>
            </div>
            <div>
              <h3 className="footer-title">Dịch Vụ</h3>
              <p>Giao Siêu Tốc</p>
              <p>Giao Tiết Kiệm</p>
            </div>
            <div>
              <h3 className="footer-title">CSKH</h3>
              <p>Email: hotro@ghnclone.vn</p>
              <p>Hotline: 1900 1234</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 GHN Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
