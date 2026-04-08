import { useState, useEffect } from 'react';
import { FiTrendingUp, FiBox, FiCheckCircle, FiAlertCircle, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, walletRes, cashflowRes] = await Promise.all([
           apiClient.get('/shop/orders').catch(() => null) as any,
           apiClient.get('/shop/wallet').catch(() => null) as any,
           apiClient.get('/shop/cashflow').catch(() => null) as any
        ]);
        
        let calculatedStats = { total_orders: 0, delivered_orders: 0, returned_orders: 0, cashflow: null };
        if (ordersRes?.status === 'success') {
           const orders = ordersRes.data || [];
           calculatedStats.total_orders = orders.length;
           calculatedStats.delivered_orders = orders.filter((o:any) => o.status === 'GIAO THÀNH CÔNG').length;
           calculatedStats.returned_orders = orders.filter((o:any) => o.status === 'ĐÃ HỦY' || o.status.includes('HOÀN')).length;
        }
        if (cashflowRes?.status === 'success') {
           calculatedStats.cashflow = cashflowRes.data;
        }
        setStats(calculatedStats);

        if (walletRes?.status === 'success') {
           setWallet(walletRes.data.wallet);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-container">Đang tải dữ liệu vận hành...</div>;
  }

  // Fallback data if API returns empty/fails for new shop
  const chartData = stats?.monthly_trend || [
    { name: 'T1', total: 0 },
    { name: 'T2', total: 0 },
    { name: 'T3', total: 0 },
    { name: 'T4', total: Math.max(stats?.total_orders || 0, 0) },
  ];

  const pieData = [
    { name: 'Thành công', value: stats?.delivered_orders || 0 },
    { name: 'Đang đi', value: Math.max(0, (stats?.total_orders || 0) - ((stats?.delivered_orders || 0) + (stats?.returned_orders || 0))) },
    { name: 'Hủy/Hoàn', value: stats?.returned_orders || 0 },
  ];
  const COLORS = ['var(--success)', 'var(--primary-color)', 'var(--danger)'];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Tổng Quan Vận Hành</h1>
        <button className="btn-primary" onClick={() => navigate('/orders/create')}>
          <FiPlus /> Lên Đơn Ngay
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon blue"><FiBox /></div>
          <div className="stat-info">
            <h4>TỔNG ĐƠN HÀNG</h4>
            <div className="stat-value">{stats?.total_orders || 0}</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon green"><FiCheckCircle /></div>
          <div className="stat-info">
            <h4>GIAO THÀNH CÔNG</h4>
            <div className="stat-value">{stats?.delivered_orders || 0}</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon red"><FiAlertCircle /></div>
          <div className="stat-info">
            <h4>HỦY / HOÀN TRẢ</h4>
            <div className="stat-value">{stats?.returned_orders || 0}</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon orange"><FiTrendingUp /></div>
          <div className="stat-info">
            <h4>ĐƠN ĐANG ĐI</h4>
            <div className="stat-value">{(stats?.total_orders || 0) - ((stats?.delivered_orders || 0) + (stats?.returned_orders || 0))}</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <div className="chart-header">
            Biểu Đồ Lượng Đơn
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="total" fill="var(--primary-color)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            Tỷ Lệ Giao Hàng
          </div>
          <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {stats?.total_orders === 0 ? (
                <div style={{color: 'var(--slate-400)'}}>Chưa có đơn hàng</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
            )}
          </div>
          {stats?.total_orders > 0 && (
            <div style={{display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', color: 'var(--slate-600)'}}>
               <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: COLORS[0]}}></div>Thành công</span>
               <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: COLORS[1]}}></div>Đang đi</span>
               <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: COLORS[2]}}></div>Hoàn/Hủy</span>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            Dòng Tiền (Tháng Này)
          </div>
          {wallet ? (
            <>
              <p style={{color: 'var(--slate-500)', fontSize: '14px'}}>Số dư ví trừ cước:</p>
              <div className="wallet-balance">
                {Number(wallet.balance).toLocaleString('vi-VN')} đ
              </div>
              <div className="wallet-details">
                <div className="wallet-row">
                  <span style={{color: 'var(--slate-500)'}}>Tiền thu hộ (COD) đã giao:</span>
                  <span style={{fontWeight: 600, color: 'var(--slate-800)'}}>{Number(stats?.cashflow?.delivered_cod_awaiting_payout || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="wallet-row">
                  <span style={{color: 'var(--slate-500)'}}>COD đang trên đường:</span>
                  <span style={{fontWeight: 600, color: 'var(--primary-color)'}}>{Number(stats?.cashflow?.pending_cod || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="wallet-row">
                  <span style={{color: 'var(--slate-500)'}}>Tổng phí ship đã trả:</span>
                  <span style={{fontWeight: 600, color: 'var(--danger)'}}>-{Number(stats?.cashflow?.total_fees_paid || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
              <button className="btn-outline" style={{width: '100%', marginTop: '30px'}} onClick={() => navigate('/wallet')}>
                Quản Lý Rút Tiền
              </button>
            </>
          ) : (
            <div className="ghn-empty-state" style={{padding: '20px'}}>
              <div className="empty-illustration" style={{width: 100, height: 100}}>
                <div className="big-question" style={{fontSize: '60px'}}>?</div>
              </div>
              <p>Chưa có dữ liệu Wallet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
