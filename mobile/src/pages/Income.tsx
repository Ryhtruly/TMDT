import { useState, useEffect } from 'react';
import {
  FiTrendingUp, FiDollarSign, FiAward,
  FiAlertCircle, FiRefreshCw, FiChevronDown, FiChevronUp, FiClock
} from 'react-icons/fi';
import api from '../api/client';
import './Income.css';

interface IncomeData {
  base_salary: number;
  total_commission: number;
  penalty: number;
  period: string;
  delivered_count?: number;
  commission_rate?: number;
}

const fmtVND = (n: number) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

const Income = () => {
  const [current, setCurrent] = useState<IncomeData | null>(null);
  const [history, setHistory] = useState<IncomeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandHistory, setExpandHistory] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchIncome = async () => {
    setLoading(true);
    try {
      const [curRes, histRes]: [any, any] = await Promise.all([
        api.get('/shipper/income').catch(() => null),
        api.get('/shipper/income/history').catch(() => null),
      ]);
      setCurrent(curRes?.data || null);
      setHistory(histRes?.data || []);
    } catch {
      showToast('Không thể tải dữ liệu lương. Thử lại sau!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncome(); }, []);

  // Demo data when no API connection
  const displayData: IncomeData = current || {
    base_salary: 5000000,
    total_commission: 0,
    penalty: 0,
    period: new Date().toISOString().slice(0, 7),
    delivered_count: 0,
    commission_rate: 4000,
  };

  const netIncome = (displayData.base_salary || 0) + (displayData.total_commission || 0) - (displayData.penalty || 0);
  const deliveredCount = displayData.delivered_count || 0;
  const commissionRate = displayData.commission_rate || 4000;

  // Tier system: <50 đơn=3k, 50-100=4k, >100=5k
  const nextTier = deliveredCount < 50 ? 50 : deliveredCount < 100 ? 100 : null;
  const currentRateLabel = deliveredCount < 50 ? '3,000đ/đơn' : deliveredCount < 100 ? '4,000đ/đơn' : '5,000đ/đơn';
  const tierProgress = nextTier ? Math.min((deliveredCount / nextTier) * 100, 100) : 100;

  const periodLabel = (period: string) => {
    const [y, m] = period.split('-');
    return `Tháng ${m}/${y}`;
  };

  return (
    <div className="income-page">
      {toast && <div className="toast toast-info">{toast}</div>}

      {/* ===== HEADER ===== */}
      <div className="income-hero">
        <div className="income-hero-bg" />
        <div className="income-hero-content">
          <div className="income-hero-top">
            <div>
              <p className="income-period-label">Thu nhập tháng</p>
              <h2 className="income-period">{periodLabel(displayData.period)}</h2>
            </div>
            <button
              className="income-refresh-btn"
              onClick={fetchIncome}
              disabled={loading}
              aria-label="Làm mới"
            >
              <FiRefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="income-loading">
              <div className="spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
              <span>Đang tải...</span>
            </div>
          ) : (
            <div className="income-net">
              <div className="income-net-label">Tổng nhận về</div>
              <div className="income-net-amount">{fmtVND(netIncome)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="income-body">
        {!loading && (
          <>
            {/* ===== BREAKDOWN ===== */}
            <div className="income-section-title">
              <FiDollarSign size={14} /> Chi tiết thu nhập
            </div>
            <div className="income-breakdown-card">
              {/* Base salary */}
              <div className="income-row">
                <div className="income-row-icon income-icon-blue">
                  <FiDollarSign size={16} />
                </div>
                <div className="income-row-info">
                  <div className="income-row-label">Lương cứng</div>
                  <div className="income-row-sub">Cố định hàng tháng</div>
                </div>
                <div className="income-row-amount income-pos">
                  + {fmtVND(displayData.base_salary)}
                </div>
              </div>

              <div className="income-divider" />

              {/* Commission */}
              <div className="income-row">
                <div className="income-row-icon income-icon-green">
                  <FiTrendingUp size={16} />
                </div>
                <div className="income-row-info">
                  <div className="income-row-label">Hoa hồng giao hàng</div>
                  <div className="income-row-sub">
                    {deliveredCount} đơn × {Number(commissionRate).toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <div className="income-row-amount income-pos">
                  + {fmtVND(displayData.total_commission)}
                </div>
              </div>

              {/* Penalty (if any) */}
              {(displayData.penalty || 0) > 0 && (
                <>
                  <div className="income-divider" />
                  <div className="income-row">
                    <div className="income-row-icon income-icon-red">
                      <FiAlertCircle size={16} />
                    </div>
                    <div className="income-row-info">
                      <div className="income-row-label">Tiền phạt</div>
                      <div className="income-row-sub">Vi phạm quy định</div>
                    </div>
                    <div className="income-row-amount income-neg">
                      − {fmtVND(displayData.penalty)}
                    </div>
                  </div>
                </>
              )}

              <div className="income-total-row">
                <span>Tổng cộng</span>
                <span>{fmtVND(netIncome)}</span>
              </div>
            </div>

            {/* Formula */}
            <div className="income-formula">
              <span>{fmtVND(displayData.base_salary)}</span>
              <span className="income-formula-op">+</span>
              <span>{fmtVND(displayData.total_commission)}</span>
              {(displayData.penalty || 0) > 0 && (
                <>
                  <span className="income-formula-op">−</span>
                  <span className="income-neg">{fmtVND(displayData.penalty)}</span>
                </>
              )}
              <span className="income-formula-op income-formula-eq">=</span>
              <span className="income-formula-result">{fmtVND(netIncome)}</span>
            </div>

            {/* ===== TIER PROGRESS ===== */}
            <div className="income-section-title">
              <FiAward size={14} /> Bậc hoa hồng
            </div>
            <div className="income-tier-card">
              <div className="income-tier-header">
                <div>
                  <div className="income-tier-current">Bậc hiện tại: <strong>{currentRateLabel}</strong></div>
                  {nextTier ? (
                    <div className="income-tier-next">
                      Cần <strong>{nextTier - deliveredCount} đơn</strong> nữa để lên {nextTier < 100 ? '4,000đ/đơn' : '5,000đ/đơn'}
                    </div>
                  ) : (
                    <div className="income-tier-max">🏆 Bạn đang ở bậc cao nhất!</div>
                  )}
                </div>
                <div className="income-tier-badge">
                  {deliveredCount < 50 ? '🥉' : deliveredCount < 100 ? '🥈' : '🥇'}
                </div>
              </div>

              <div className="income-tier-bar-wrap">
                <div
                  className="income-tier-bar-fill"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>

              <div className="income-tier-labels">
                <span>0 đơn</span>
                {nextTier && <span>{nextTier} đơn</span>}
              </div>

              {/* Tier table */}
              <div className="income-tier-table">
                <div className={`income-tier-row ${deliveredCount < 50 ? 'active' : ''}`}>
                  <span>🥉 Dưới 50 đơn</span>
                  <span>3,000đ/đơn</span>
                </div>
                <div className={`income-tier-row ${deliveredCount >= 50 && deliveredCount < 100 ? 'active' : ''}`}>
                  <span>🥈 50 – 100 đơn</span>
                  <span>4,000đ/đơn</span>
                </div>
                <div className={`income-tier-row ${deliveredCount >= 100 ? 'active' : ''}`}>
                  <span>🥇 Trên 100 đơn</span>
                  <span>5,000đ/đơn</span>
                </div>
              </div>
            </div>

            {/* ===== HISTORY ===== */}
            {history.length > 0 && (
              <>
                <button
                  className="income-history-toggle"
                  onClick={() => setExpandHistory(v => !v)}
                >
                  <div className="income-section-title" style={{ margin: 0 }}>
                    <FiClock size={14} /> Lịch sử lương
                  </div>
                  {expandHistory ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>

                {expandHistory && (
                  <div className="income-history-list animate-slide-up">
                    {history.map((h, i) => {
                      const net = (h.base_salary || 0) + (h.total_commission || 0) - (h.penalty || 0);
                      return (
                        <div className="income-history-row" key={i}>
                          <div>
                            <div className="income-history-period">{periodLabel(h.period)}</div>
                            <div className="income-history-sub">
                              {h.total_commission > 0 && `Hoa hồng: ${fmtVND(h.total_commission)}`}
                              {h.penalty > 0 && ` · Phạt: ${fmtVND(h.penalty)}`}
                            </div>
                          </div>
                          <div className="income-history-amount">{fmtVND(net)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Income;
