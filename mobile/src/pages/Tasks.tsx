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
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  cod_amount: number | string;
  status: string;
  weight: number;
  item_value?: number | string;
  store_name?: string;
  pickup_address?: string;
  province?: string;
  district?: string;
  attempt_count?: number;
  created_at?: string;
}

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

  const inTransit = filteredDeliveries.filter(o => ['ĐÃ LẤY HÀNG', 'ĐANG GIAO'].includes(o.status));
  const toRedeliver = filteredDeliveries.filter(o => o.status === 'GIAO THẤT BẠI');

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

        {/* Actions */}
        <div className="task-actions">
          <button className="task-btn task-btn-call" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={14} /> Gọi Shop
          </button>
          <button className="task-btn task-btn-map" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
            <FiNavigation size={14} /> Chỉ đường
          </button>
          <button className="task-btn task-btn-scan" onClick={() => scanOrder(order.tracking_code, 'pickup')}>
            <FiChevronRight size={14} /> Quét lấy
          </button>
        </div>
      </div>
    );
  };

  const renderDeliveryCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;
    const isRetry = order.status === 'GIAO THẤT BẠI';
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
                {attemptNo >= 3 && ' · ⚠️ Tính phí giao lại'}
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
