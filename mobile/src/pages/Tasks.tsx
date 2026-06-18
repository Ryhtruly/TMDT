import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiPackage, FiMapPin, FiPhone, FiNavigation,
  FiRefreshCw, FiClock, FiSearch, FiX,
  FiAlertCircle, FiChevronRight
} from 'react-icons/fi';
import api from '../api/client';
import './Tasks.css';

type TabType = 'pickup' | 'delivery';

interface Order {
  id_order: number;
  tracking_code: string;
  is_p2p_broadcast?: boolean;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  cod_amount: number | string;
  status: string;
  current_shipper_id?: number | null;
  weight: number;
  item_value?: number | string;
  store_name?: string;
  pickup_address?: string;
  province?: string;
  district?: string;
  attempt_count?: number;
  created_at?: string;
  dest_spoke_name?: string;
  dest_hub_name?: string;
}

const ORDER_STATUS = {
  WAITING_PICKUP: '\u0043\u0048\u1edc \u004c\u1ea4\u0059 \u0048\u00c0\u004e\u0047',
  PICKED_UP: '\u0110\u00c3 \u004c\u1ea4\u0059 \u0048\u00c0\u004e\u0047',
  IN_TRANSIT: '\u0110\u0041\u004e\u0047 \u0054\u0052\u0055\u004e\u0047 \u0043\u0048\u0055\u0059\u1ec2\u004e',
  AT_WAREHOUSE: '\u0054\u1ea0\u0049 \u004b\u0048\u004f',
  INBOUND_WAREHOUSE: '\u004e\u0048\u1eac\u0050 \u004b\u0048\u004f',
  DELIVERING: '\u0110\u0041\u004e\u0047 \u0047\u0049\u0041\u004f',
  DELIVERED: '\u0047\u0049\u0041\u004f \u0054\u0048\u00c0\u004e\u0048 \u0043\u00d4\u004e\u0047',
  DELIVERY_FAILED: '\u0047\u0049\u0041\u004f \u0054\u0048\u1ea4\u0054 \u0042\u1ea0\u0049',
};

const mojibakeOnce = (value: string) => unescape(encodeURIComponent(value));
const statusVariants = (status: string) => Array.from(new Set([status, mojibakeOnce(status), mojibakeOnce(mojibakeOnce(status))]));
const statusIs = (actual: string, canonical: string) => statusVariants(canonical).includes(String(actual || ''));
const statusIn = (actual: string, canonicals: string[]) => canonicals.some(status => statusIs(actual, status));

const STATUS_MAP: Record<string, { text: string; cls: string; color: string }> = {
  'CHỜ LẤY HÀNG':   { text: 'Chờ lấy', cls: 'badge-waiting',  color: '#f59e0b' },
  'ĐÃ LẤY HÀNG':    { text: 'Đã lấy',  cls: 'badge-pickup',   color: '#ea580c' },
  'ĐANG GIAO':       { text: 'Đang giao', cls: 'badge-transit', color: '#3b82f6' },
  'GIAO THÀNH CÔNG': { text: 'Thành công', cls: 'badge-success', color: '#10b981' },
  'GIAO THẤT BẠI':   { text: 'Thất bại', cls: 'badge-failed',  color: '#ef4444' },
};

const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'pickup';
  const [tab, setTab] = useState<TabType>(initialTab);
  const [pickups, setPickups] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [spokeName, setSpokeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCod, setFilterCod] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [pRes, dRes]: [any, any] = await Promise.all([
        api.get('/shipper/pickup-list').catch(() => null),
        api.get('/shipper/delivery-list').catch(() => null),
      ]);
      setPickups(pRes?.data?.orders || pRes?.orders || []);
      setSpokeName(pRes?.data?.assigned_spoke || pRes?.assigned_spoke || '');
      setDeliveries(dRes?.data?.orders || dRes?.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const switchTab = (t: TabType) => {
    setTab(t);
    setSearchParams({ tab: t });
    setSearch('');
    setFilterCod(false);
  };

  const openMaps = (address: string) => {
    const q = encodeURIComponent(address + ', Việt Nam');
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const callPhone = (phone: string) => (window.location.href = `tel:${phone}`);

  const scanOrder = (code: string, mode: string) => {
    window.location.href = `/scan?code=${code}&mode=${mode}`;
  };

  const acceptP2p = async (code: string) => {
    try {
      setLoading(true);
      await api.post('/shipper/p2p/accept', { tracking_code: code });
      alert('Nhận cuốc hỏa tốc thành công! Vui lòng tới điểm gửi để lấy hàng.');
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi nhận cuốc.');
      setLoading(false);
    }
  };

  const acceptPickup = async (code: string) => {
    try {
      setLoading(true);
      await api.post('/shipper/pickup/accept', { tracking_code: code });
      alert('Nhan don thanh cong. Don nay da khoa cho ban, shipper khac se khong the nhan.');
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Co loi xay ra khi nhan don.');
      setLoading(false);
    }
  };

  const renderRouteSteps = (order: Order, type: TabType) => {
    const pickupDone = type === 'delivery' || !statusIs(order.status, ORDER_STATUS.WAITING_PICKUP);
    const inWarehouse = statusIn(order.status, [ORDER_STATUS.AT_WAREHOUSE, ORDER_STATUS.INBOUND_WAREHOUSE, ORDER_STATUS.IN_TRANSIT]) || order.status === 'T?I KHO';
    const delivering = statusIn(order.status, [ORDER_STATUS.PICKED_UP, ORDER_STATUS.DELIVERING, ORDER_STATUS.DELIVERY_FAILED]) || type === 'delivery';
    const done = statusIs(order.status, ORDER_STATUS.DELIVERED);
    const steps = type === 'pickup'
      ? [
          { label: 'Nhan don', active: !!order.current_shipper_id || pickupDone },
          { label: 'Toi shop', active: !!order.current_shipper_id },
          { label: 'Quet lay', active: pickupDone },
        ]
      : [
          { label: 'Tai kho', active: inWarehouse || delivering || done },
          { label: 'Dang giao', active: delivering || done },
          { label: 'Hoan tat', active: done },
        ];

    return (
      <div className="task-route-steps">
        {steps.map((step, index) => (
          <div className={`task-route-step${step.active ? ' active' : ''}`} key={step.label}>
            <span className="task-route-dot" />
            <span className="task-route-label">{step.label}</span>
            {index < steps.length - 1 && <span className="task-route-line" />}
          </div>
        ))}
      </div>
    );
  };

  // Filtered lists
  const filteredPickups = useMemo(() => {
    let list = pickups;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.tracking_code.toLowerCase().includes(s) ||
        o.receiver_name.toLowerCase().includes(s) ||
        (o.store_name || '').toLowerCase().includes(s)
      );
    }
    if (filterCod) list = list.filter(o => Number(o.cod_amount) > 0);
    return list;
  }, [pickups, search, filterCod]);

  const filteredDeliveries = useMemo(() => {
    let list = deliveries;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.tracking_code.toLowerCase().includes(s) ||
        o.receiver_name.toLowerCase().includes(s)
      );
    }
    if (filterCod) list = list.filter(o => Number(o.cod_amount) > 0);
    return list;
  }, [deliveries, search, filterCod]);

  const inTransit = filteredDeliveries.filter(o => statusIn(o.status, [ORDER_STATUS.PICKED_UP, ORDER_STATUS.DELIVERING]));
  const toRedeliver = filteredDeliveries.filter(o => statusIs(o.status, ORDER_STATUS.DELIVERY_FAILED));

  const renderPickupCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;
    const isUrgent = hasCod && Number(order.cod_amount) >= 500000;
    return (
      <div className={`task-card animate-fade-in ${isUrgent ? 'task-card-urgent' : ''}`} key={order.tracking_code}>
        <div className="task-card-header">
          <div>
            <div className="task-track-code">{order.tracking_code}</div>
            {order.created_at && (
              <div className="task-time"><FiClock size={10} /> {timeAgo(order.created_at)}</div>
            )}
          </div>
          <div className="task-header-right">
            {isUrgent && <span className="task-urgent-badge">💰 Ưu tiên</span>}
            {order.is_p2p_broadcast && <span className="task-urgent-badge" style={{backgroundColor: '#ea580c', color: '#fff'}}>🔥 HỎA TỐC</span >}
            <span className={`badge ${STATUS_MAP[order.status]?.cls || 'badge-waiting'}`}>
              {STATUS_MAP[order.status]?.text || order.status}
            </span>
          </div>
        </div>

        {/* Store info */}
        <div className="task-info-row">
          <FiPackage size={13} className="task-info-icon" />
          <span className="task-store-name">{order.store_name || 'Shop'}</span>
        </div>

        {/* Pickup address */}
        <button className="task-address-row" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
          <FiMapPin size={13} className="task-info-icon text-muted" />
          <span className="task-address-text truncate">{order.pickup_address || 'Địa chỉ lấy hàng...'}</span>
          <FiNavigation size={12} className="task-nav-icon" />
        </button>

        {/* Meta */}
        <div className="task-meta-row">
          <span className="task-meta-chip task-meta-weight">
            <FiPackage size={11} /> {Number(order.weight || 0).toLocaleString()}g
          </span>
          {hasCod && (
            <span className="task-meta-chip task-meta-cod">
              💵 COD: {Number(order.cod_amount).toLocaleString('vi-VN')}đ
            </span>
          )}
          {order.province && (
            <span className="task-meta-chip">
              <FiMapPin size={11} /> {order.district}, {order.province}
            </span>
          )}
        </div>

        {renderRouteSteps(order, 'pickup')}

        {/* Actions */}
        <div className="task-actions">
          {order.is_p2p_broadcast ? (
            <button className="task-btn task-btn-map" style={{ width: '100%', backgroundColor: '#ea580c', color: '#fff', fontWeight: 'bold' }} onClick={() => acceptP2p(order.tracking_code)}>
              🔥 Nhận Cuốc Hỏa Tốc
            </button>
          ) : (
            <>
              {!order.current_shipper_id && (
                <button className="task-btn task-btn-accept" onClick={() => acceptPickup(order.tracking_code)}>
                  Nhan don
                </button>
              )}
              <button className="task-btn task-btn-call" onClick={() => callPhone(order.receiver_phone)}>
                <FiPhone size={14} /> Gọi Shop
              </button>
              <button className="task-btn task-btn-map" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
                <FiNavigation size={14} /> Chỉ đường
              </button>
              <button className="task-btn task-btn-scan" onClick={() => scanOrder(order.tracking_code, 'pickup')}>
                <FiChevronRight size={14} /> Quét lấy
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDeliveryCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;
    const isRetry = statusIs(order.status, ORDER_STATUS.DELIVERY_FAILED);
    const attemptNo = Number(order.attempt_count || 0);

    return (
      <div
        className={`task-card animate-fade-in ${isRetry ? 'task-card-retry' : ''}`}
        key={order.tracking_code}
      >
        <div className="task-card-header">
          <div>
            <div className="task-track-code">{order.tracking_code}</div>
            {isRetry && attemptNo > 0 && (
              <div className="task-retry-note">
                <FiAlertCircle size={11} />
                Lần giao thứ {attemptNo + 1}
                {attemptNo >= 3 && ' · ⚠️ Shop bị tính phí giao lại'}
              </div>
            )}
          </div>
          <span className={`badge ${STATUS_MAP[order.status]?.cls || 'badge-transit'}`}>
            {STATUS_MAP[order.status]?.text || order.status}
          </span>
        </div>

        {/* Receiver */}
        <div className="task-receiver-row">
          <div className="task-receiver-name">{order.receiver_name}</div>
          <button className="task-call-chip" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={12} /> {order.receiver_phone}
          </button>
        </div>

        {/* Delivery address */}
        <button className="task-address-row" onClick={() => openMaps(order.receiver_address)}>
          <FiMapPin size={13} className="task-info-icon text-muted" />
          <span className="task-address-text truncate">{order.receiver_address}</span>
          <FiNavigation size={12} className="task-nav-icon" />
        </button>

        {/* Meta */}
        <div className="task-meta-row">
          <span className="task-meta-chip task-meta-weight">
            <FiPackage size={11} /> {Number(order.weight || 0).toLocaleString()}g
          </span>
          {hasCod && (
            <span className="task-meta-chip task-meta-cod">
              💵 Thu: {Number(order.cod_amount).toLocaleString('vi-VN')}đ
            </span>
          )}
          {order.province && (
            <span className="task-meta-chip">
              <FiMapPin size={11} /> {order.district}, {order.province}
            </span>
          )}
        </div>

        {renderRouteSteps(order, 'delivery')}

        {/* Actions */}
        <div className="task-actions">
          <button className="task-btn task-btn-call" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={14} /> Gọi khách
          </button>
          <button className="task-btn task-btn-map" onClick={() => openMaps(order.receiver_address)}>
            <FiNavigation size={14} /> Chỉ đường
          </button>
          <button className="task-btn task-btn-scan" onClick={() => scanOrder(order.tracking_code, 'deliver')}>
            <FiChevronRight size={14} /> Cập nhật
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-header-top">
          <div>
            <h2 className="tasks-title">Lịch Trình Hôm Nay</h2>
            {spokeName && (
              <p className="tasks-spoke"><FiMapPin size={11} /> {spokeName}</p>
            )}
          </div>
          <button className="tasks-refresh" onClick={fetchTasks} aria-label="Làm mới">
            <FiRefreshCw size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tasks-tabs">
          <button
            className={`tasks-tab${tab === 'pickup' ? ' active' : ''}`}
            onClick={() => switchTab('pickup')}
          >
            📦 Lấy hàng
            <span className="tasks-tab-count">{pickups.length}</span>
          </button>
          <button
            className={`tasks-tab${tab === 'delivery' ? ' active' : ''}`}
            onClick={() => switchTab('delivery')}
          >
            🛵 Giao hàng
            <span className="tasks-tab-count">{deliveries.length}</span>
          </button>
        </div>

        {/* Search + Filter */}
        <div className="tasks-search-row">
          <div className="tasks-search-wrap">
            <FiSearch size={15} className="tasks-search-icon" />
            <input
              className="tasks-search-input"
              type="search"
              placeholder={tab === 'pickup' ? 'Tìm mã / tên shop...' : 'Tìm mã / tên khách...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="tasks-search-clear" onClick={() => setSearch('')}>
                <FiX size={14} />
              </button>
            )}
          </div>
          <button
            className={`tasks-filter-btn${filterCod ? ' active' : ''}`}
            onClick={() => setFilterCod(v => !v)}
          >
            💵 COD
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="tasks-content">
        {loading ? (
          <div className="spinner-center">
            <div className="spinner" />
            Đang tải danh sách...
          </div>
        ) : tab === 'pickup' ? (
          filteredPickups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>{search ? 'Không tìm thấy kết quả' : 'Không có đơn cần lấy hàng'}</p>
              <span>Khu vực của bạn hiện đã xử lý hết</span>
            </div>
          ) : (
            <div className="tasks-list">
              {filteredPickups.map(o => renderPickupCard(o))}
              <div className="tasks-footer">
                <FiClock size={11} /> {filteredPickups.length} đơn · Cập nhật {new Date().toLocaleTimeString('vi-VN')}
              </div>
            </div>
          )
        ) : (
          /* Delivery tab — grouped */
          filteredDeliveries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛵</div>
              <p>{search ? 'Không tìm thấy kết quả' : 'Không có đơn cần giao'}</p>
              <span>Lịch giao hàng của bạn trống</span>
            </div>
          ) : (
            <div className="tasks-list">
              {inTransit.length > 0 && (
                <>
                  <div className="tasks-group-label">
                    🚀 Đang trên đường giao ({inTransit.length})
                  </div>
                  {inTransit.map(o => renderDeliveryCard(o))}
                </>
              )}
              {toRedeliver.length > 0 && (
                <>
                  <div className="tasks-group-label tasks-group-label-warn">
                    ⚠️ Cần giao lại ({toRedeliver.length})
                  </div>
                  {toRedeliver.map(o => renderDeliveryCard(o))}
                </>
              )}
              <div className="tasks-footer">
                <FiClock size={11} /> {filteredDeliveries.length} đơn · Cập nhật {new Date().toLocaleTimeString('vi-VN')}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Tasks;
