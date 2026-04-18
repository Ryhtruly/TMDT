import { useState, useEffect } from 'react';
import { FiDollarSign, FiActivity, FiTerminal, FiList } from 'react-icons/fi';
import apiClient from '../api/client';

const AuditAndSalary = () => {
  const [activeTab, setActiveTab] = useState<'salary' | 'audit'>('salary');

  // Salary Tab
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState('2026-04');
  const [idShipper, setIdShipper] = useState('');
  const [shippers, setShippers] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false);
  const [salaryMsg, setSalaryMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Tab
  const [logs, setLogs] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchLogs();
    } else {
      fetchSalaryHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchShippers = async () => {
      try {
        const res: any = await apiClient.get('/admin/employees');
        setShippers((res.data || []).filter((e: any) => (e.roles || []).includes('SHIPPER')));
      } catch (err) {
        console.error(err);
      }
    };
    fetchShippers();
  }, []);

  const fetchLogs = async () => {
    setLogLoading(true);
    try {
      const res = await apiClient.get('/admin/audit-log?limit=100');
      // apiClient interceptor đã unwrap .data, res = { status, data: [...] }
      setLogs(res?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLogLoading(false);
    }
  };

  const fetchSalaryHistory = async () => {
    if (!idShipper) return;
    setSalaryHistoryLoading(true);
    try {
      // Gọi API lịch sử lương - dùng audit log lọc theo shipper
      const res = await apiClient.get(`/admin/audit-log?limit=20`);
      const data = res?.data || [];
      setSalaryHistory(data.filter((l: any) => l.object_type === 'SHIPPER_INCOME'));
    } catch (error) {
      console.error(error);
    } finally {
      setSalaryHistoryLoading(false);
    }
  };

  const handleComputeSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idShipper) return alert('Nhập ID Tài xế');
    setSalaryLoading(true);
    setSalaryMsg(null);
    try {
      const payload = {
        id_user: parseInt(idShipper),
        period: salaryMonth,
        base_salary: 5000000,
        penalty: 0
      };
      await apiClient.post('/admin/shipper-salary', payload);
      setSalaryMsg({ type: 'success', text: `✅ Đã chốt sổ lương tháng ${salaryMonth} cho Tài xế ID=${idShipper}!` });
      fetchSalaryHistory();
    } catch (error: any) {
      setSalaryMsg({ type: 'error', text: 'Lỗi: ' + (error.response?.data?.message || error.message) });
    } finally {
      setSalaryLoading(false);
    }
  };

  const getActionStyle = (action: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      'TẠO': { bg: '#d1fae5', color: '#047857' },
      'SỬA': { bg: '#fef3c7', color: '#b45309' },
      'XÓA': { bg: '#fee2e2', color: '#b91c1c' },
      'INSERT': { bg: '#d1fae5', color: '#047857' },
      'UPDATE': { bg: '#fef3c7', color: '#b45309' },
      'DELETE': { bg: '#fee2e2', color: '#b91c1c' },
    };
    return map[action] || { bg: '#f3f4f6', color: '#374151' };
  };

  return (
    <div className="audit-salary-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Bộ Tham Mưu Hệ Thống</h1>
          <p className="page-subtitle">Kiểm toán Nhật ký và Quyết toán Lương Nhân Sự Giao Hàng.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <FiDollarSign className="tab-icon" /> Quyết Toán Lương Shipper
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <FiActivity className="tab-icon" /> Nhật Ký Kiểm Toán (Audit Log)
          </button>
        </div>

        <div className="tab-content" style={{ minHeight: '400px' }}>
          {activeTab === 'salary' ? (
            <div style={{ padding: '24px 0' }}>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#fff3ec', padding: '20px', borderRadius: '8px', color: '#F26522', marginBottom: '30px' }}>
                  <h4 style={{ marginBottom: '10px' }}><FiTerminal /> Thuật toán Lương Cơ bản:</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Hệ thống tính <strong>Lương cứng</strong> + <strong>Hoa hồng</strong> (từ đơn giao thành công) - <strong>khoản Phạt</strong> (đền bù sự cố).
                    Sau khi nhấn Quyết Toán, dữ liệu sẽ được cập nhật vào bảng <code>shipper_incomes</code>.
                  </p>
                </div>

                <form onSubmit={handleComputeSalary} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tài xế (Shipper)</label>
                    <select required className="form-control" value={idShipper} onChange={e => setIdShipper(e.target.value)}>
                      <option value="">-- Chọn tài xế cần quyết toán --</option>
                      {shippers.map(s => <option key={s.id_employee} value={s.id_user}>EMP-{s.id_employee} : {s.full_name} ({s.phone})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tháng Quyết Toán</label>
                    <input type="month" required className="form-control"
                      value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={salaryLoading}
                    style={{ padding: '14px', fontSize: '1rem', marginTop: '8px' }}>
                    {salaryLoading ? '⚙️ Đang tính toán...' : '💰 QUYẾT TOÁN & ĐÓNG PHIÊN LƯƠNG'}
                  </button>
                </form>

                {/* Thông báo sau khi qừt toán */}
                {salaryMsg && (
                  <div style={{
                    marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                    backgroundColor: salaryMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: salaryMsg.type === 'success' ? '#047857' : '#b91c1c', fontWeight: 500
                  }}>
                    {salaryMsg.text}
                  </div>
                )}

                {/* Sách kê lương */}
                <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#374151' }}>
                    <FiList /> Sao Kê Lương Gần Đây
                  </h4>
                  {salaryHistoryLoading ? (
                    <div className="loading-state">Đang tải...</div>
                  ) : salaryHistory.length > 0 ? (
                    <table className="admin-table">
                      <thead><tr>
                        <th>ID</th><th>Thời gian</th><th>Payload</th>
                      </tr></thead>
                      <tbody>
                        {salaryHistory.map((l: any) => (
                          <tr key={l.id_audit}>
                            <td>#{l.id_audit}</td>
                            <td style={{ fontSize: '0.8rem' }}>{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                            <td><code style={{ fontSize: '0.75rem', color: '#2563eb' }}>{JSON.stringify(l.payload_json)}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                      Nhập ID Tài xế và bấm Quyết Toán để xem dữ liệu. Bảng đầy đủ: <code>shipper_incomes</code>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <div style={{ backgroundColor: '#1F2937', color: '#10b981', padding: '10px 15px', borderRadius: '8px 8px 0 0', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                &gt;_ AUDIT LOG — LIVE STREAM ({logs.length} bản ghi)
              </div>
              {logLoading ? (
                <div className="loading-state">Đang tải nhật ký hệ thống...</div>
              ) : (
                <table className="admin-table" style={{ border: '1px solid #E5E7EB', borderTop: 'none' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ width: '12%' }}>ID & Thời gian</th>
                      <th style={{ width: '10%' }}>Hành động</th>
                      <th style={{ width: '18%' }}>Đối tượng (Table)</th>
                      <th style={{ width: '12%' }}>Thực hiện bởi</th>
                      <th style={{ width: '48%' }}>Payload Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const style = getActionStyle(log.action);
                      return (
                        <tr key={log.id_audit} style={{ fontFamily: 'monospace', fontSize: '0.83rem' }}>
                          <td style={{ color: '#6b7280' }}>
                            #{log.id_audit}<br />
                            <span style={{ fontSize: '0.75rem' }}>
                              {new Date(log.created_at).toLocaleString('vi-VN')}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold',
                              backgroundColor: style.bg, color: style.color
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                            {log.object_type}
                          </td>
                          <td>
                            {log.id_actor ? `USER-${log.id_actor}` : 'SYSTEM'}
                          </td>
                          <td style={{ maxWidth: '400px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                            <code style={{ backgroundColor: '#f3f4f6', padding: '3px 6px', borderRadius: '4px', color: '#2563eb', fontSize: '0.78rem' }}>
                              {typeof log.payload_json === 'object'
                                ? JSON.stringify(log.payload_json)
                                : log.payload_json || '{}'}
                            </code>
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr><td colSpan={5} className="empty-state">Chưa có nhật ký kiểm toán nào.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditAndSalary;
