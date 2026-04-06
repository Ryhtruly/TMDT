import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { FiCamera, FiX, FiCheckCircle, FiXCircle, FiUpload, FiPackage } from 'react-icons/fi';
import api from '../api/client';
import './Scanner.css';

type Mode = 'pickup' | 'deliver' | 'start';
type Step = 'scan' | 'confirm' | 'success' | 'fail';
type FailReason = string;

const FAIL_REASONS: FailReason[] = [
  'Khách gọi không nghe máy / không liên lạc được',
  'Khách hẹn giao lại ngày khác',
  'Sai địa chỉ giao hàng',
  'Khách từ chối nhận hàng',
  'Hàng bị hư hỏng trong quá trình vận chuyển',
  'Địa chỉ không tồn tại',
  'Khách vắng nhà cả ngày',
];

const Scanner = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code') || '';
  const initialMode = (searchParams.get('mode') as Mode) || 'pickup';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>('scan');
  const [manualCode, setManualCode] = useState(initialCode);
  const [scannedCode, setScannedCode] = useState('');
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [resultData, setResultData] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);

  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Default to the last camera which is often the USB / external / back camera
        setSelectedCameraId(devices[devices.length - 1].id);
      }
    }).catch(err => console.warn('Error getting cameras:', err));
  }, []);

  const startScanner = useCallback(() => {
    if (!selectedCameraId) {
      showToast('Không tìm thấy camera. Vui lòng cấp quyền hoặc kết nối USB webcam.', 'error');
      return;
    }
    setScannerActive(true);
    setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(scannerDivId);
        scannerRef.current = html5QrCode;
        html5QrCode.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText: string) => {
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
              setScannerActive(false);
            }).catch(() => {});
            setManualCode(decodedText.trim().toUpperCase());
            showToast(`Quét thành công: ${decodedText}`, 'success');
          },
          () => {} // Ignore scan failures
        ).catch(err => {
          showToast(`Lỗi bật camera: ${err}`, 'error');
          setScannerActive(false);
        });
      } catch (err) {
        showToast('Lỗi khởi tạo Scanner!', 'error');
        setScannerActive(false);
      }
    }, 200);
  }, [selectedCameraId]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setScannerActive(false);
      }).catch(() => {
        try { scannerRef.current?.clear(); } catch (_) {}
        setScannerActive(false);
      });
    } else {
      setScannerActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, []);

  // Handle evidence image
  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = () => setEvidencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const lookupOrder = async (code: string) => {
    try {
      const res: any = await api.get(`/track/${code}`);
      return res?.data || null;
    } catch {
      return null;
    }
  };

  const handleProcess = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) { showToast('Vui lòng nhập hoặc quét mã vận đơn!', 'error'); return; }
    setLoading(true);
    try {
      if (mode === 'pickup') {
        const res: any = await api.post('/shipper/scan/pickup', { tracking_code: code });
        if (res?.status === 'success') {
          setScannedCode(code);
          setResultData(res);
          setStep('success');
          showToast('✅ Xác nhận lấy hàng thành công!', 'success');
        }
      } else if (mode === 'start') {
        const info = await lookupOrder(code);
        setOrderInfo(info);
        const res: any = await api.post('/shipper/scan/start-delivery', { tracking_code: code });
        if (res?.status === 'success') {
          setScannedCode(code);
          setResultData(res);
          setStep('confirm');
        }
      } else if (mode === 'deliver') {
        const info = await lookupOrder(code);
        setOrderInfo(info);
        setScannedCode(code);
        setStep('confirm');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi xử lý. Kiểm tra lại mã!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivered = async () => {
    setLoading(true);
    try {
      const evidenceUrl = evidencePreview || undefined;
      const res: any = await api.post('/shipper/scan/delivered', {
        tracking_code: scannedCode,
        evidence_url: evidenceUrl,
      });
      if (res?.status === 'success') {
        setResultData(res);
        setStep('success');
        showToast('🎉 Giao hàng thành công!', 'success');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể xác nhận giao hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReportFailed = async () => {
    const reason = failReason === 'custom' ? customReason : failReason;
    if (!reason) { showToast('Vui lòng chọn lý do giao thất bại!', 'error'); return; }
    setLoading(true);
    try {
      const res: any = await api.post('/shipper/scan/failed', {
        tracking_code: scannedCode,
        reason_fail: reason,
        evidence_url: evidencePreview || undefined,
      });
      if (res?.status === 'success') {
        setResultData(res);
        setStep('success');
        showToast('Đã ghi nhận giao thất bại.', 'info');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Lỗi khi ghi nhận thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('scan');
    setManualCode('');
    setScannedCode('');
    setOrderInfo(null);
    setFailReason('');
    setCustomReason('');
    setEvidenceFile(null);
    setEvidencePreview('');
    setResultData(null);
    stopScanner();
  };

  // ================== RENDER ==================

  const renderScanStep = () => (
    <div className="sc-scan-step">
      {/* Mode Selector */}
      <div className="sc-mode-bar">
        <button className={mode === 'pickup' ? 'sc-mode-btn active' : 'sc-mode-btn'} onClick={() => setMode('pickup')}>📦 Lấy hàng</button>
        <button className={mode === 'start' ? 'sc-mode-btn active' : 'sc-mode-btn'} onClick={() => setMode('start')}>🚀 Bắt đầu giao</button>
        <button className={mode === 'deliver' ? 'sc-mode-btn active' : 'sc-mode-btn'} onClick={() => setMode('deliver')}>✅ Cập nhật</button>
      </div>

      {/* Mode description */}
      <div className="sc-mode-desc">
        {mode === 'pickup' && '📦 Quét mã xác nhận bạn đã lấy hàng từ shop'}
        {mode === 'start' && '🚀 Quét mã để bắt đầu hành trình giao hàng'}
        {mode === 'deliver' && '✅ Quét mã để cập nhật kết quả giao hàng'}
      </div>

      {/* Camera Scanner */}
      {!scannerActive ? (
        <div style={{ padding: '0 14px' }}>
          {cameras.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <select 
                className="form-control" 
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid var(--slate-200)' }}
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                ))}
              </select>
            </div>
          )}
          <button className="sc-cam-btn" onClick={startScanner} style={{ margin: 0, width: '100%' }}>
            <FiCamera size={32} />
            <span>Bật Camera Quét Mã</span>
            <small>Mã QR hoặc Barcode vận đơn</small>
          </button>
        </div>
      ) : (
        <div className="sc-camera-wrap">
          <div id={scannerDivId} />
          <button className="sc-stop-cam" onClick={stopScanner}><FiX size={16} /> Tắt camera</button>
        </div>
      )}

      {/* Manual entry */}
      <div className="sc-manual">
        <div className="sc-manual-label">hoặc nhập tay mã vận đơn:</div>
        <div className="sc-manual-row">
          <input
            type="text"
            className="form-control sc-manual-input"
            placeholder="VD: GHN_0001"
            value={manualCode}
            onChange={e => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleProcess()}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={handleProcess} disabled={loading || !manualCode.trim()}>
        {loading ? <span className="spinner-sm" /> : '⚡ Xử Lý Ngay'}
      </button>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="sc-confirm-step">
      <div className="sc-confirm-badge">📋 Xác nhận kết quả giao</div>
      {orderInfo && (
        <div className="sc-order-card">
          <div className="sc-order-code">{scannedCode}</div>
          <div className="sc-order-row"><span>Người nhận:</span><strong>{orderInfo.receiver_name}</strong></div>
          <div className="sc-order-row"><span>SĐT:</span><strong>{orderInfo.receiver_phone}</strong></div>
          <div className="sc-order-row"><span>Địa chỉ:</span><strong>{orderInfo.receiver_address}</strong></div>
          {Number(orderInfo.cod_amount) > 0 && (
            <div className="sc-order-row cod-highlight"><span>💵 COD:</span><strong>{Number(orderInfo.cod_amount).toLocaleString('vi-VN')}đ</strong></div>
          )}
        </div>
      )}

      {/* Upload evidence */}
      <div className="sc-evidence-section">
        <div className="sc-ev-label"><FiUpload size={13} /> Ảnh bằng chứng (tuỳ chọn)</div>
        <label className="sc-ev-upload">
          <input type="file" accept="image/*" capture="environment" onChange={handleEvidenceUpload} hidden />
          {evidencePreview
            ? <img src={evidencePreview} alt="evidence" className="sc-ev-preview" />
            : <><FiCamera size={24} /><span>Chụp ảnh gói hàng</span></>
          }
        </label>
      </div>

      <div className="sc-confirm-actions">
        <button className="btn-success" onClick={handleConfirmDelivered} disabled={loading}>
          {loading ? <span className="spinner-sm" /> : <><FiCheckCircle size={16} /> Giao Thành Công</>}
        </button>

        {/* Fail section */}
        <div className="sc-fail-divider">— hoặc —</div>
        <div className="sc-fail-reason">
          <div className="sc-fail-label"><FiXCircle size={13} /> Chọn lý do thất bại:</div>
          <div className="sc-reasons-list">
            {FAIL_REASONS.map(r => (
              <button
                key={r}
                className={failReason === r ? 'sc-reason-btn active' : 'sc-reason-btn'}
                onClick={() => setFailReason(r)}
              >{r}</button>
            ))}
            <button className={failReason === 'custom' ? 'sc-reason-btn active' : 'sc-reason-btn'} onClick={() => setFailReason('custom')}>✏️ Nhập lý do khác...</button>
          </div>
          {failReason === 'custom' && (
            <textarea
              className="form-control"
              rows={2}
              placeholder="Mô tả lý do cụ thể..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              style={{ margin: '8px 0', fontSize: 13 }}
            />
          )}
          <button className="btn-danger" onClick={handleReportFailed} disabled={loading || !failReason}>
            {loading ? <span className="spinner-sm" /> : <><FiXCircle size={15} /> Báo Giao Thất Bại</>}
          </button>
        </div>
      </div>

      <button className="sc-back-btn" onClick={resetAll}>← Quét mã khác</button>
    </div>
  );

  const renderSuccessStep = () => {
    const isFailReport = resultData?.new_status === 'GIAO THẤT BẠI' || resultData?.status === 'GIAO THẤT BẠI';
    return (
      <div className="sc-result-step">
        <div className={`sc-result-icon ${isFailReport ? 'fail' : 'ok'}`}>
          {isFailReport ? <FiXCircle size={42} /> : <FiCheckCircle size={42} />}
        </div>
        <h3 className="sc-result-title">{isFailReport ? 'Đã ghi nhận thất bại' : 'Thành công!'}</h3>
        <div className="sc-result-code"><FiPackage size={14} /> {resultData?.tracking_code || scannedCode}</div>
        <div className="sc-result-msg">{resultData?.message}</div>
        {resultData?.redelivery_fee_charged > 0 && (
          <div className="sc-fee-warn">
            ⚠️ Phí giao lại lần {resultData?.attempt_no}: <strong>{Number(resultData.redelivery_fee_charged).toLocaleString('vi-VN')}đ</strong> đã trừ ví Shop
          </div>
        )}
        <div className="sc-result-actions">
          <button className="btn-primary" onClick={resetAll}>⚡ Quét Mã Tiếp Theo</button>
          <button className="btn-outline" onClick={() => navigate('/tasks')}>📋 Xem Lịch Trình</button>
        </div>
      </div>
    );
  };

  return (
    <div className="scanner-page">
      {toastMsg && <div className={`toast toast-${toastType}`}>{toastMsg}</div>}

      <div className="sc-page-header">
        <h2 className="sc-page-title">📷 Quét Mã Vận Đơn</h2>
        <p className="sc-page-sub">Lấy hàng · Giao hàng · Cập nhật trạng thái</p>
      </div>

      {step === 'scan' && renderScanStep()}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
};

export default Scanner;
