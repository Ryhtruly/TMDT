import { useState } from 'react';
import { FiSearch, FiTruck, FiShield, FiClock } from 'react-icons/fi';
import apiClient from '../../api/client';
import './LandingPage.css';

const LandingPage = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    
    setIsSearching(true);
    setTrackError('');
    setTrackResult(null);
    try {
      // NOTE: This assumes /orders/track/:tracking is open
      const res = await apiClient.get(`/orders/track/${trackingCode.trim()}`);
      if (res?.data) setTrackResult(res.data);
      else setTrackError('Không tìm thấy thông tin đơn hàng này.');
    } catch (err: any) {
      setTrackError(err.response?.data?.message || 'Không tìm thấy vận đơn.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Banner Area */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">GIAO NHANH HƠN, <br/>KINH DOANH TỐT HƠN</h1>
            <p className="hero-subtitle">
              Giải pháp vận chuyển tối ưu dành cho nhà bán hàng. Miễn phí lấy hàng, đối soát COD mỗi ngày.
            </p>
            
            {/* Tracking Widget */}
            <div className="tracking-widget">
              <h3 className="widget-title">Theo Dõi Đơn Hàng</h3>
              <form onSubmit={handleTrack} className="tracking-form">
                <input 
                  type="text" 
                  className="form-control tracking-input"
                  placeholder="Nhập mã vận đơn (VD: GHN_0001)..." 
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
                <button type="submit" className="btn-primary tracking-btn" disabled={isSearching}>
                  <FiSearch style={{fontSize: '18px'}} /> Tra Cứu
                </button>
              </form>
              
              {trackError && <div className="track-error">{trackError}</div>}
            </div>
            
          </div>
          <div className="hero-graphic">
             {/* We will eventually load a GHN illustration here */}
             <div className="illustration-placeholder">
                <FiTruck className="truck-icon" />
             </div>
          </div>
        </div>
      </section>

      {/* Track Result Section */}
      {trackResult && (
        <section className="track-result-section">
          <div className="container">
             <div className="card track-card">
                <div className="track-header">
                   <h2>Thông tin Vận Đơn: {trackResult.order?.tracking_code}</h2>
                   <span className={`status-badge ${trackResult.order?.status === 'GIAO THÀNH CÔNG' ? 'success' : ''}`}>
                     {trackResult.order?.status}
                   </span>
                </div>
                <div className="track-timeline">
                  {trackResult.timeline?.map((log: any, idx: number) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <strong>{log.action}</strong> tại {log.location_name}
                        <div className="timeline-time">{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                      </div>
                    </div>
                  ))}
                  {(!trackResult.timeline || trackResult.timeline.length === 0) && (
                    <p style={{marginTop: '20px', color: '#666'}}>Chưa có hành trình nào được ghi nhận.</p>
                  )}
                </div>
             </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Điểm Nổi Bật</h2>
          <div className="features-grid">
            <div className="feature-card">
               <div className="feature-icon"><FiClock /></div>
               <h3>Giao Hàng Siêu Tốc</h3>
               <p>Hệ thống chia chọn tự động, rút ngắn thời gian xử lý và giao hàng tận tay người nhận nhanh nhất.</p>
            </div>
            <div className="feature-card">
               <div className="feature-icon"><FiShield /></div>
               <h3>Hoàn Tiền 100%</h3>
               <p>Chính sách bảo hiểm hàng hóa ưu việt. Đền bù rủi ro lên đến 5,000,000đ cho đơn hàng giá trị cao.</p>
            </div>
            <div className="feature-card">
               <div className="feature-icon"><FiTruck /></div>
               <h3>Đối Soát Mỗi Ngày</h3>
               <p>Cam kết đối soát tiền thu hộ COD từ thứ 2 đến thứ 6, giúp nhà bán hàng xoay vòng vốn tức thì.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
