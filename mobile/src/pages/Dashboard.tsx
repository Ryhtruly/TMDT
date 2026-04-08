import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPackage,
  FiCheckCircle,
  FiAlertTriangle,
  FiMapPin,
  FiRefreshCw,
  FiChevronRight,
  FiCamera,
  FiList,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
} from 'react-icons/fi';
import api from '../api/client';
import useAuth from '../hooks/useAuth';
import './Dashboard.css';

interface DashboardStats {
  pickup_count: number;
  delivery_count: number;
  delivered_today: number;
  failed_today: number;
  pending_cod: number;
  assigned_spoke: string;
}

const useCountUp = (target: number, duration = 800) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
};

const StatCard = ({
  icon,
  label,
  value,
  color,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'orange' | 'blue' | 'green' | 'red';
  sublabel?: string;
  onClick?: () => void;
}) => {
  const animated = useCountUp(value);
  return (
    <button className={`db-stat-card db-stat-${color}`} onClick={onClick}>
      <div className="db-stat-icon-wrap">{icon}</div>
      <div className="db-stat-value">{animated}</div>
      <div className="db-stat-label">{label}</div>
      {sublabel && <div className="db-stat-sub">{sublabel}</div>}
    </button>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStart] = useState(() => {
    const saved = localStorage.getItem('session_start');
    if (saved) return new Date(saved);
    const now = new Date();
    localStorage.setItem('session_start', now.toISOString());
    return now;
  });
  const [sessionTime, setSessionTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setSessionTime(`${h > 0 ? `${h}g ` : ''}${m}ph`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const fetchData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const summaryRes: any = await api.get('/shipper/summary').catch(() => null);
      const summary = summaryRes?.data || {};

      setStats({
        pickup_count: Number(summary.pickup_count || 0),
        delivery_count: Number(summary.delivery_count || 0),
        delivered_today: Number(summary.delivered_today || 0),
        failed_today: Number(summary.failed_today || 0),
        pending_cod: Number(summary.pending_cod || 0),
        assigned_spoke: summary.assigned_spoke || 'Chua phan cong',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chao buoi sang';
    if (h < 18) return 'Chao buoi chieu';
    return 'Chao buoi toi';
  };

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });

  const totalDeliveries = (stats?.delivered_today ?? 0) + (stats?.delivery_count ?? 0) + (stats?.failed_today ?? 0);
  const progressPct = totalDeliveries > 0 ? Math.round(((stats?.delivered_today ?? 0) / totalDeliveries) * 100) : 0;

  return (
    <div className="db-page">
      <div className="db-hero">
        <div className="db-hero-bg" />
        <div className="db-hero-content">
          <div className="db-hero-top">
            <div>
              <p className="db-greeting">{greeting()}</p>
              <h2 className="db-name">{user?.display_name || user?.phone || 'Shipper'}</h2>
              <div className="db-meta-row">
                <span className="db-spoke-badge">
                  <FiMapPin size={11} />
                  {stats?.assigned_spoke || 'Dang tai vung...'}
                </span>
                <span className="db-date-badge">
                  <FiClock size={11} />
                  {today}
                </span>
              </div>
            </div>
            <button
              className={`db-refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={() => fetchData(true)}
              disabled={refreshing}
              aria-label="Lam moi"
            >
              <FiRefreshCw size={17} />
            </button>
          </div>

          <div className="db-session-bar">
            <div className="db-session-item">
              <span className="db-session-icon">⏱</span>
              <span>
                Ca hom nay: <strong>{sessionTime || '0ph'}</strong>
              </span>
            </div>
            {stats && totalDeliveries > 0 && (
              <div className="db-session-item">
                <span className="db-session-icon">📦</span>
                <span>
                  Tien do: <strong>{progressPct}%</strong>
                </span>
              </div>
            )}
          </div>

          {stats && totalDeliveries > 0 && (
            <div className="db-progress">
              <div className="db-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="db-body">
        {loading ? (
          <div className="spinner-center">
            <div className="spinner" />
            <span>Dang tai du lieu ca lam viec...</span>
          </div>
        ) : (
          <>
            <div className="db-section-title">
              <FiTrendingUp size={14} /> Thong ke hom nay
            </div>
            <div className="db-stats-grid">
              <StatCard
                icon={<FiPackage size={22} />}
                label="Can lay hang"
                value={stats?.pickup_count ?? 0}
                color="orange"
                sublabel="don cho"
                onClick={() => navigate('/tasks?tab=pickup')}
              />
              <StatCard
                icon={<FiMapPin size={22} />}
                label="Dang giao"
                value={stats?.delivery_count ?? 0}
                color="blue"
                sublabel="don"
                onClick={() => navigate('/tasks?tab=delivery')}
              />
              <StatCard
                icon={<FiCheckCircle size={22} />}
                label="Da giao xong"
                value={stats?.delivered_today ?? 0}
                color="green"
                sublabel="thanh cong"
                onClick={() => navigate('/cod')}
              />
              <StatCard
                icon={<FiAlertTriangle size={22} />}
                label="Giao that bai"
                value={stats?.failed_today ?? 0}
                color="red"
                sublabel="can giao lai"
                onClick={() => navigate('/tasks?tab=delivery')}
              />
            </div>

            {Number(stats?.pending_cod ?? 0) > 0 && (
              <>
                <div className="db-section-title">
                  <FiDollarSign size={14} /> Tien dang giu
                </div>
                <div className="db-cod-card" onClick={() => navigate('/cod')}>
                  <div className="db-cod-icon">
                    <FiDollarSign size={24} />
                  </div>
                  <div className="db-cod-info">
                    <div className="db-cod-amount">{Number(stats?.pending_cod || 0).toLocaleString('vi-VN')}d</div>
                    <div className="db-cod-note">COD va phi thu ho chua nop</div>
                  </div>
                  <div className="db-cod-arrow">
                    <FiChevronRight size={18} />
                    <span>Doi soat</span>
                  </div>
                </div>
              </>
            )}

            <div className="db-section-title">⚡ Hanh dong nhanh</div>
            <div className="db-quick-grid">
              <button className="db-action-card db-action-orange" onClick={() => navigate('/scan?mode=pickup')}>
                <div className="db-action-icon">
                  <FiCamera size={24} />
                </div>
                <div className="db-action-label">Quet lay hang</div>
                {(stats?.pickup_count ?? 0) > 0 && <div className="db-action-badge">{stats!.pickup_count}</div>}
              </button>

              <button className="db-action-card db-action-green" onClick={() => navigate('/scan?mode=deliver')}>
                <div className="db-action-icon">
                  <FiCheckCircle size={24} />
                </div>
                <div className="db-action-label">Xac nhan giao</div>
              </button>

              <button className="db-action-card db-action-blue" onClick={() => navigate('/tasks')}>
                <div className="db-action-icon">
                  <FiList size={24} />
                </div>
                <div className="db-action-label">Xem lich trinh</div>
              </button>

              <button className="db-action-card db-action-purple" onClick={() => navigate('/cod')}>
                <div className="db-action-icon">
                  <FiDollarSign size={24} />
                </div>
                <div className="db-action-label">Nop tien hom nay</div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
