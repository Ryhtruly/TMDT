import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { FiCamera, FiX, FiCheckCircle, FiXCircle, FiPackage, FiDownload, FiUpload, FiMapPin } from 'react-icons/fi';
import api from '../../api/client';
import './WarehouseScanner.css';

const WarehouseScanner = () => {
  const location = useLocation();
  const initiallyInbound = location.pathname.includes('inbound');
  
  const [mode, setMode] = useState<'inbound' | 'outbound'>(initiallyInbound ? 'inbound' : 'outbound');
  const [manualCode, setManualCode] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [recentScans, setRecentScans] = useState<any[]>([]);
  
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [scannerActive, setScannerActive] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = 'wh-scanner-container';

  // Khi location thay đổi, cập nhật mode
  useEffect(() => {
    setMode(location.pathname.includes('inbound') ? 'inbound' : 'outbound');
  }, [location.pathname]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const processCode = async (code: string) => {
    if (!code) return;
    setLoading(true);
    try {
      let res: any;
      if (mode === 'inbound') {
        res = await api.post('/stockkeeper/scan/inbound', { 
          tracking_code: code,
          shelf_location: shelfLocation || undefined
        });
      } else {
        res = await api.post('/stockkeeper/scan/outbound', {
          tracking_code: code
        });
      }

      if (res?.status === 'success') {
        showToast(res.message || 'Thao tác thành công!', 'success');
        
        // Thêm vào log quét gần đây
        const newScan = {
          tracking_code: code,
          time: new Date().toLocaleTimeString('vi-VN'),
          status: 'success',
          msg: mode === 'inbound' ? 'Đã nhập kho' : 'Đã xuất kho'
        };
        setRecentScans(prev => [newScan, ...prev].slice(0, 5));
        setManualCode(''); // Clear manual input
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi xử lý mẫ. Kiểm tra lại!', 'error');
      const newScan = {
        tracking_code: code,
        time: new Date().toLocaleTimeString('vi-VN'),
        status: 'error',
        msg: err?.response?.data?.message || 'Lỗi'
      };
      setRecentScans(prev => [newScan, ...prev].slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  const handleManualProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processCode(manualCode.trim().toUpperCase());
    }
  };

  const startScanner = useCallback(() => {
    setScannerActive(true);
    setTimeout(() => {
      if (scannerRef.current) { try { scannerRef.current.clear(); } catch (_) {} }
      const scanner = new Html5QrcodeScanner(
        scannerDivId,
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );
      scanner.render(
        (decodedText: string) => {
          // Pause scanning temporarily? Or process immediately.
          // Because continuous scan is fast, we might process same barcode multiple times.
          // The API will reject if status doesn't match, which is safe.
          scanner.pause(true);
          processCode(decodedText.trim().toUpperCase()).then(() => {
            scanner.resume(); 
          });
        },
        () => {} 
      );
      scannerRef.current = scanner;
    }, 200);
  }, [mode, shelfLocation]); // Re-bind if dependencies change

  const stopScanner = () => {
    if (scannerRef.current) { try { scannerRef.current.clear(); } catch (_) {} }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => { if (scannerRef.current) { try { scannerRef.current.clear(); } catch (_) {} } };
  }, []);

  return (
    <div className="wh-scanner-page">
      {toastMsg && <div className={`toast toast-${toastType}`}>{toastMsg}</div>}

      <div className={`wh-header ${mode}`}>
        <div className="wh-header-icon">
          {mode === 'inbound' ? <FiDownload size={28} /> : <FiUpload size={28} />}
        </div>
        <div className="wh-header-text">
          <h2 className="wh-title">
            {mode === 'inbound' ? 'Nhập Kho (Inbound)' : 'Xuất Kho (Outbound)'}
          </h2>
          <p className="wh-subtitle">Quét liên tục thao tác tự động</p>
        </div>
      </div>

      <div className="wh-body">
        {mode === 'inbound' && (
          <div className="wh-shelf-box">
            <label><FiMapPin size={14}/> Vị trí kệ (Khu vực lưu trữ):</label>
            <input 
              type="text" 
              placeholder="VD: A-01 (không bắt buộc)" 
              value={shelfLocation}
              onChange={e => setShelfLocation(e.target.value.toUpperCase())}
            />
          </div>
        )}

        {/* Màn hình Camera */}
        <div className="wh-cam-box">
          {!scannerActive ? (
            <button className="btn-start-cam" onClick={startScanner}>
              <FiCamera size={32} />
              <span>Mở Camera Quét {mode === 'inbound' ? 'Nhập' : 'Xuất'}</span>
            </button>
          ) : (
            <div className="wh-cam-active">
              <div id={scannerDivId} />
              <button className="btn-stop-cam" onClick={stopScanner}>
                <FiX size={16} /> Tắt Camera
              </button>
            </div>
          )}
        </div>

        <div className="wh-manual-box">
          <div className="wh-divider">HOẶC NHẬP MÃ</div>
          <form className="wh-manual-form" onSubmit={handleManualProcess}>
            <input 
              type="text" 
              placeholder="Nhập mã vận đơn (VD: GHST...)" 
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
            />
            <button type="submit" disabled={loading || !manualCode.trim()} className={mode}>
              {loading ? <span className="spinner-sm" /> : 'Xử lý'}
            </button>
          </form>
        </div>

        {/* Lịch sử quét */}
        <div className="wh-history">
          <h4 className="wh-history-title">Lịch sử quét vừa xong</h4>
          {recentScans.length === 0 ? (
            <div className="wh-empty-history">Chưa có kiện hàng nào được quét.</div>
          ) : (
            <div className="wh-scan-list">
              {recentScans.map((scan, i) => (
                <div key={i} className={`wh-scan-item ${scan.status}`}>
                  <div className="si-icon">
                    {scan.status === 'success' ? <FiCheckCircle /> : <FiXCircle />}
                  </div>
                  <div className="si-info">
                    <div className="si-code"><FiPackage size={12}/> {scan.tracking_code}</div>
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
