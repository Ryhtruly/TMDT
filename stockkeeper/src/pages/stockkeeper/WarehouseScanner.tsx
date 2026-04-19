import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiDownload, FiUpload, FiCheckCircle, FiXCircle, FiPackage, FiMapPin, FiSend } from 'react-icons/fi';
import api from '../../api/client';
import './WarehouseScanner.css';

const WarehouseScanner = () => {
  const location = useLocation();
  const isInbound = location.pathname.includes('inbound');
  const mode = isInbound ? 'inbound' : 'outbound';

  const [code, setCode] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [location.pathname]);

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => {
      setFeedback(null);
      inputRef.current?.focus();
    }, 2000);
  };

  const processCode = async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    const upperCode = trackingCode.trim().toUpperCase();
    try {
      let res: any;
      if (mode === 'inbound') {
        res = await api.post('/stockkeeper/scan/inbound', {
          tracking_code: upperCode,
          shelf_location: shelfLocation || undefined
        });
      } else {
        res = await api.post('/stockkeeper/scan/outbound', {
          tracking_code: upperCode
        });
      }

      if (res?.status === 'success') {
        showFeedback(res.message || 'Thao tác thành công!', 'success');
        setRecentScans(prev => [{
          code: upperCode,
          time: new Date().toLocaleTimeString('vi-VN'),
          status: 'success',
          msg: mode === 'inbound' ? 'Đã nhập kho' : 'Đã xuất kho'
        }, ...prev].slice(0, 50));
        setCode('');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Lỗi xử lý mã. Kiểm tra lại!';
      showFeedback(errorMsg, 'error');
      setRecentScans(prev => [{
        code: upperCode,
        time: new Date().toLocaleTimeString('vi-VN'),
        status: 'error',
        msg: errorMsg
      }, ...prev].slice(0, 50));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCode(code);
  };

  return (
    <div className="wh-scanner-page">
      {/* Full-screen feedback overlay */}
      {feedback && (
        <div className="kiosk-feedback-overlay">
          <div className={`kiosk-feedback-card ${feedback.type}`}>
            {feedback.type === 'success'
              ? <FiCheckCircle size={80} color="#10b981" />
              : <FiXCircle size={80} color="#ef4444" />
            }
            <h3>{feedback.type === 'success' ? 'THÀNH CÔNG' : 'LỖI'}</h3>
            <p>{feedback.msg}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`wh-header ${mode}`}>
        <div className="wh-header-icon">
          {mode === 'inbound' ? <FiDownload size={40} /> : <FiUpload size={40} />}
        </div>
        <div className="wh-header-text">
          <h2>{mode === 'inbound' ? 'Nhập Kho (Inbound)' : 'Xuất Kho (Outbound)'}</h2>
          <p>Nhập mã vận đơn hoặc mã bao kiện vào ô bên dưới rồi bấm nút.</p>
        </div>
      </div>

      <div className="wh-body">
        {/* Main input panel */}
        <div className="wh-main-panel">
          {mode === 'inbound' && (
            <div className="wh-shelf-box">
              <label><FiMapPin size={16} /> Vị trí kệ (tùy chọn)</label>
              <input
                type="text"
                placeholder="VD: K-01, TẦNG 2"
                value={shelfLocation}
                onChange={e => setShelfLocation(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <div className="wh-input-card">
            <div className="wh-input-title">
              {mode === 'inbound' ? '📥 Mã Nhập Kho' : '📤 Mã Xuất Kho'}
            </div>
            <form onSubmit={handleSubmit} className="wh-input-form">
              <input
                ref={inputRef}
                type="text"
                className="wh-code-input"
                placeholder="Nhập mã vận đơn hoặc mã bao (B-XXXXXX)..."
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className={`wh-submit-btn ${mode}`}
                disabled={loading || !code.trim()}
              >
                {loading
                  ? <span className="spinner-sm" />
                  : <><FiSend size={20} /> {mode === 'inbound' ? 'Nhập Kho' : 'Xuất Kho'}</>
                }
              </button>
            </form>
            <p className="wh-hint">
              Hỗ trợ quét mã vạch bằng súng laser — bấm Enter để tự gửi.
              Nhập mã bao <strong>B-XXXXXX</strong> để xử lý toàn bộ đơn trong bao.
            </p>
          </div>
        </div>

        {/* History panel */}
        <div className="wh-history">
          <h4 className="wh-history-title">
            Lịch sử {mode === 'inbound' ? 'Nhập' : 'Xuất'} kho
            {recentScans.length > 0 && <span className="wh-history-count">{recentScans.length}</span>}
          </h4>
          {recentScans.length === 0 ? (
            <div className="wh-empty-history">Sẵn sàng. Hãy bắt đầu quét.</div>
          ) : (
            <div className="wh-scan-list">
              {recentScans.map((scan, i) => (
                <div key={i} className={`wh-scan-item ${scan.status}`}>
                  <div className="si-icon">
                    {scan.status === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                  </div>
                  <div className="si-info">
                    <div className="si-code"><FiPackage size={14} /> {scan.code}</div>
                    <div className="si-msg">{scan.msg}</div>
                  </div>
                  <div className="si-time">{scan.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseScanner;
