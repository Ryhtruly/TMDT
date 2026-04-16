import { useState, useEffect } from 'react';
import { FiPackage, FiUsers, FiHome, FiDollarSign, FiTrendingUp, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, users: 0, shops: 0, wallets: 0, cod_pending_shipper: 0, cod_pending_payout: 0, cod_paid_this_month: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [res, logRes] = await Promise.all([
          apiClient.get('/admin/dashboard-stats'),
          apiClient.get('/admin/audit-log')
        ]);
        if (res.data) {
          setStats(res.data);
          if (res.data.chartData) setChartData(res.data.chartData);
        }
        if (logRes.data) setLogs(logRes.data.slice(0, 4));
      } catch (error) {
        console.error("Lỗi lấy Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="page-header d-flex justify-between items-center" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Chào mừng trở lại, Admin! 👋</h1>
          <p className="page-subtitle">Theo dõi các chỉ số hoạt động cốt lõi của toàn hệ thống Logistics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => alert('[System Admin] Đang tổng hợp dữ liệu toàn hệ thống. File Báo_Cáo_Logistics_2026.xlsx sẽ được tải xuống trong giây lát!')} style={{ backgroundColor: '#fff', color: 'var(--slate-700)', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
             Xuất Báo Cáo
          </button>
          <button className="btn-primary" onClick={() => navigate('/promotions')}>
            + Tạo Chiến Dịch Mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Khởi tạo dữ liệu thời gian thực...</div>
      ) : (
        <>
          <div className="stats-grid">
            {/* Card 1 */}
            <div className="stat-card">
              <div className="stat-card-top">
                <h3 className="stat-title">TỔNG GIAO DỊCH</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#fff3ec', color: '#ea580c' }}>
                  <FiPackage />
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">{stats.orders.toLocaleString()}</div>
                <div className="stat-trend positive">
                   <FiArrowUpRight /> <span>12.5%</span> so với tháng trước
                </div>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="stat-card">
              <div className="stat-card-top">
                <h3 className="stat-title">NGƯỜI DÙNG ACTIVE</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <FiUsers />
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">{stats.users.toLocaleString()}</div>
                <div className="stat-trend positive">
                   <FiArrowUpRight /> <span>8.2%</span> so với tháng trước
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="stat-card">
              <div className="stat-card-top">
                <h3 className="stat-title">LƯỢNG ĐỐI TÁC (SHOPS)</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <FiHome />
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">{stats.shops.toLocaleString()}</div>
                <div className="stat-trend negative">
                   <FiArrowDownRight /> <span>1.1%</span> gian hàng đóng cửa
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="stat-card">
              <div className="stat-card-top">
                <h3 className="stat-title">DÒNG TIỀN NỀN TẢNG</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#fcf5ff', color: '#9333ea' }}>
                  <FiDollarSign />
                </div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">{stats.wallets.toLocaleString()} đ</div>
                <div className="stat-trend positive">
                   <FiArrowUpRight /> <span>24.3%</span> tăng trưởng doanh thu
                </div>
              </div>
            </div>
          </div>

          {/* COD Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/payouts')}>
              <div className="stat-card-top">
                <h3 className="stat-title">COD CHỜ SHIPPER NỘP</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}><FiDollarSign /></div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value" style={{ fontSize: 20 }}>{stats.cod_pending_shipper.toLocaleString('vi-VN')} đ</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Cần admin xác nhận đã thu tiền mặt</div>
              </div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/payouts')}>
              <div className="stat-card-top">
                <h3 className="stat-title">COD CHỜ PAYOUT SHOP</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}><FiDollarSign /></div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value" style={{ fontSize: 20 }}>{stats.cod_pending_payout.toLocaleString('vi-VN')} đ</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Cần admin duyệt chuyển khoản</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <h3 className="stat-title">COD ĐÃ PAYOUT THÁNG NÀY</h3>
                <div className="stat-icon-soft" style={{ backgroundColor: '#d1fae5', color: '#047857' }}><FiDollarSign /></div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value" style={{ fontSize: 20, color: '#047857' }}>{stats.cod_paid_this_month.toLocaleString('vi-VN')} đ</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Đã chuyển về tài khoản shop</div>
              </div>
            </div>
          </div>

          <div className="charts-section" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
            <div className="admin-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                   <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)' }}>Hiệu Suất Vận Đơn <FiTrendingUp style={{ color: '#10b981', marginLeft: '4px' }}/></h3>
                   <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '4px' }}>Sản lượng theo mốc thời gian Giao & Nhận.</p>
                </div>
                <select className="form-control" style={{ width: '130px', padding: '6px 10px' }}>
                   <option>7 Ngày Qua</option>
                   <option>Tháng Này</option>
                </select>
              </div>
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F26522" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#F26522" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                       itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="orders" stroke="#F26522" strokeWidth={3} fillOpacity={1} fill="url(#colorO)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '20px' }}>Hoạt Động Gần Đây</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 {logs.map((log, i) => (
                   <div key={i} style={{ display: 'flex', gap: '12px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: log.action === 'TẠO' ? '#10b981' : log.action === 'SỬA' ? '#f59e0b' : '#ef4444', marginTop: '6px' }}></div>
                     <div>
                       <p style={{ fontSize: '13.5px', color: 'var(--slate-700)', fontWeight: 500 }}>{log.action} bản ghi [{log.object_type}]</p>
                       <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                         Bởi ID {log.id_actor} lúc {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                       </p>
                     </div>
                   </div>
                 ))}
                 {logs.length === 0 && <p className="text-muted" style={{fontSize: '13px'}}>Chưa có dữ liệu hệ thống.</p>}
                 <button className="btn-primary" onClick={() => navigate('/audit-salary')} style={{ width: '100%', marginTop: '10px', backgroundColor: '#fff', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}>
                    Xem Tất Cả Nhật Ký
                 </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
