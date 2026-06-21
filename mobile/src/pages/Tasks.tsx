import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import axios from 'axios';
import api from '../api/client';
import './Tasks.css';

type TabType = 'pickup' | 'to-warehouse' | 'delivery';

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
  pickup_phone?: string;
  province?: string;
  district?: string;
  attempt_count?: number;
  created_at?: string;
  current_shipper_id?: number | null;
  dest_hub_name?: string;
  is_p2p_broadcast?: boolean;
}

interface TaskListPayload {
  orders?: Order[];
  assigned_spoke?: string;
}

interface TaskListResponse {
  data?: TaskListPayload;
  orders?: Order[];
  assigned_spoke?: string;
}

const STATUS_MAP: Record<string, { text: string; cls: string; color: string }> = {
  'CHỜ LẤY HÀNG': { text: 'Cho lay', cls: 'badge-waiting', color: '#f59e0b' },
  'CHá»œ Láº¤Y HÃ€NG': { text: 'Cho lay', cls: 'badge-waiting', color: '#f59e0b' },
  'ĐÃ LẤY HÀNG': { text: 'Da lay', cls: 'badge-pickup', color: '#ea580c' },
  'ÄÃƒ Láº¤Y HÃ€NG': { text: 'Da lay', cls: 'badge-pickup', color: '#ea580c' },
  'ĐANG GIAO': { text: 'Dang giao', cls: 'badge-transit', color: '#3b82f6' },
  'ÄANG GIAO': { text: 'Dang giao', cls: 'badge-transit', color: '#3b82f6' },
  'GIAO THÀNH CÔNG': { text: 'Thanh cong', cls: 'badge-success', color: '#10b981' },
  'GIAO THÃ€NH CÃ”NG': { text: 'Thanh cong', cls: 'badge-success', color: '#10b981' },
  'GIAO THẤT BẠI': { text: 'That bai', cls: 'badge-failed', color: '#ef4444' },
  'GIAO THáº¤T Báº I': { text: 'That bai', cls: 'badge-failed', color: '#ef4444' },
};

const normalizeStatus = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const statusIs = (value: string, expected: string) => normalizeStatus(value) === normalizeStatus(expected);
const statusIn = (value: string, expected: string[]) => expected.some((item) => statusIs(value, item));
const getStatusMeta = (value: string) => {
  if (statusIs(value, 'CHỜ LẤY HÀNG')) return { text: 'Cho lay', cls: 'badge-waiting', color: '#f59e0b' };
  if (statusIs(value, 'ĐÃ LẤY HÀNG')) return { text: 'Da lay', cls: 'badge-pickup', color: '#ea580c' };
  if (statusIs(value, 'ĐANG GIAO')) return { text: 'Dang giao', cls: 'badge-transit', color: '#3b82f6' };
  if (statusIs(value, 'GIAO THÀNH CÔNG')) return { text: 'Thanh cong', cls: 'badge-success', color: '#10b981' };
  if (statusIs(value, 'GIAO THẤT BẠI')) return { text: 'That bai', cls: 'badge-failed', color: '#ef4444' };
  return STATUS_MAP[value];
};
const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return 'vua xong';
  if (minutes < 60) return `${minutes} phut truoc`;
  if (hours < 24) return `${hours} gio truoc`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'pickup';
  const [tab, setTab] = useState<TabType>(initialTab);
  const [pickups, setPickups] = useState<Order[]>([]);
  const [toWarehouseOrders, setToWarehouseOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [spokeName, setSpokeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCod, setFilterCod] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [pRes, twRes, dRes]: Array<TaskListResponse | null> = await Promise.all([
        api.get('/shipper/pickup-list').catch(() => null),
        api.get('/shipper/to-warehouse-list').catch(() => null),
        api.get('/shipper/delivery-list').catch(() => null),
      ]);
      setPickups(pRes?.data?.orders || pRes?.orders || []);
      setSpokeName(pRes?.data?.assigned_spoke || pRes?.assigned_spoke || '');
      setToWarehouseOrders(twRes?.data?.orders || twRes?.orders || []);
      setDeliveries(dRes?.data?.orders || dRes?.orders || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const switchTab = (nextTab: TabType) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab });
    setSearch('');
    setFilterCod(false);
  };

  const openMaps = (address: string) => {
    const query = encodeURIComponent(`${address}, Viet Nam`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const scanOrder = (code: string, mode: string) => {
    window.location.href = `/scan?code=${code}&mode=${mode}`;
  };

  const acceptPickup = async (code: string, isP2p?: boolean) => {
    try {
      setLoading(true);
      await api.post(isP2p ? '/shipper/p2p/accept' : '/shipper/pickup/accept', { tracking_code: code });
      alert(isP2p ? 'Nhan cuoc hoa toc thanh cong.' : 'Nhan don thanh cong. Don nay da duoc khoa cho ban.');
      await fetchTasks();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Co loi xay ra khi nhan don.'));
      setLoading(false);
    }
  };

  const renderRouteSteps = (order: Order, type: TabType) => {
    const pickupDone =
      type === 'delivery' || type === 'to-warehouse' || !statusIs(order.status, 'CHỜ LẤY HÀNG');
    const inWarehouse = statusIn(order.status, ['TẠI KHO', 'NHẬP KHO', 'ĐANG TRUNG CHUYỂN']);
    const delivering = statusIn(order.status, ['ĐÃ LẤY HÀNG', 'ĐANG GIAO', 'GIAO THẤT BẠI']) || type === 'delivery';
    const done = statusIs(order.status, 'GIAO THÀNH CÔNG');

    const steps =
      type === 'pickup' || type === 'to-warehouse'
        ? [
            { label: 'Nhan don', active: !!order.current_shipper_id || pickupDone },
            { label: 'Toi shop', active: !!order.current_shipper_id || pickupDone },
            { label: 'Quet lay', active: pickupDone },
            { label: 'Dua ve kho', active: false },
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

  const filteredPickups = useMemo(() => {
    let list = pickups;
    if (search) {
      const keyword = search.toLowerCase();
      list = list.filter(
        (order) =>
          order.tracking_code.toLowerCase().includes(keyword) ||
          order.receiver_name.toLowerCase().includes(keyword) ||
          (order.store_name || '').toLowerCase().includes(keyword)
      );
    }
    if (filterCod) list = list.filter((order) => Number(order.cod_amount) > 0);
    return list;
  }, [pickups, search, filterCod]);

  const filteredToWarehouse = useMemo(() => {
    let list = toWarehouseOrders;
    if (search) {
      const keyword = search.toLowerCase();
      list = list.filter(
        (order) =>
          order.tracking_code.toLowerCase().includes(keyword) ||
          order.receiver_name.toLowerCase().includes(keyword) ||
          (order.store_name || '').toLowerCase().includes(keyword)
      );
    }
    if (filterCod) list = list.filter((order) => Number(order.cod_amount) > 0);
    return list;
  }, [toWarehouseOrders, search, filterCod]);

  const filteredDeliveries = useMemo(() => {
    let list = deliveries;
    if (search) {
      const keyword = search.toLowerCase();
      list = list.filter(
        (order) =>
          order.tracking_code.toLowerCase().includes(keyword) ||
          order.receiver_name.toLowerCase().includes(keyword)
      );
    }
    if (filterCod) list = list.filter((order) => Number(order.cod_amount) > 0);
    return list;
  }, [deliveries, search, filterCod]);

  const inTransit = filteredDeliveries.filter((order) => statusIn(order.status, ['ĐÃ LẤY HÀNG', 'ĐANG GIAO']));
  const toRedeliver = filteredDeliveries.filter((order) => statusIs(order.status, 'GIAO THẤT BẠI'));

  const renderPickupCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;
    const isUrgent = hasCod && Number(order.cod_amount) >= 500000;
    const isAccepted = !!order.current_shipper_id;
    const isP2p = !!order.is_p2p_broadcast;

    return (
      <div className={`task-card animate-fade-in ${isUrgent ? 'task-card-urgent' : ''}`} key={order.tracking_code}>
        <div className="task-card-header">
          <div>
            <div className="task-track-code">{order.tracking_code}</div>
            {order.created_at && (
              <div className="task-time">
                <FiClock size={10} /> {timeAgo(order.created_at)}
              </div>
            )}
          </div>
          <div className="task-header-right">
            {isUrgent && <span className="task-urgent-badge">Uu tien</span>}
            <span className={`badge ${getStatusMeta(order.status)?.cls || 'badge-waiting'}`}>
              {getStatusMeta(order.status)?.text || order.status}
            </span>
          </div>
        </div>

        <div className="task-info-row">
          <FiPackage size={13} className="task-info-icon" />
          <span className="task-store-name">{order.store_name || 'Shop'}</span>
        </div>

        <button className="task-address-row" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
          <FiMapPin size={13} className="task-info-icon text-muted" />
          <span className="task-address-text truncate">{order.pickup_address || 'Dia chi lay hang...'}</span>
          <FiNavigation size={12} className="task-nav-icon" />
        </button>

        <div className="task-meta-row">
          <span className="task-meta-chip task-meta-weight">
            <FiPackage size={11} /> {Number(order.weight || 0).toLocaleString()}g
          </span>
          {hasCod && <span className="task-meta-chip task-meta-cod">COD: {Number(order.cod_amount).toLocaleString('vi-VN')}d</span>}
          {order.province && (
            <span className="task-meta-chip">
              <FiMapPin size={11} /> {order.district}, {order.province}
            </span>
          )}
        </div>

        {renderRouteSteps(order, 'pickup')}

        <div className="task-actions">
          <button className="task-btn task-btn-call" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={14} /> Goi Shop
          </button>
          <button className="task-btn task-btn-map" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
            <FiNavigation size={14} /> Chi duong
          </button>
          {isAccepted ? (
            <button className="task-btn task-btn-scan" onClick={() => scanOrder(order.tracking_code, 'pickup')}>
              <FiChevronRight size={14} /> Quet lay
            </button>
          ) : (
            <button className="task-btn task-btn-accept" onClick={() => acceptPickup(order.tracking_code, isP2p)}>
              <FiChevronRight size={14} /> Nhan don
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDeliveryCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;
    const isRetry = statusIs(order.status, 'GIAO THẤT BẠI');
    const attemptNo = Number(order.attempt_count || 0);

    return (
      <div className={`task-card animate-fade-in ${isRetry ? 'task-card-retry' : ''}`} key={order.tracking_code}>
        <div className="task-card-header">
          <div>
            <div className="task-track-code">{order.tracking_code}</div>
            {isRetry && attemptNo > 0 && (
              <div className="task-retry-note">
                <FiAlertCircle size={11} />
                Lan giao thu {attemptNo + 1}
              </div>
            )}
          </div>
          <span className={`badge ${getStatusMeta(order.status)?.cls || 'badge-transit'}`}>
            {getStatusMeta(order.status)?.text || order.status}
          </span>
        </div>

        <div className="task-receiver-row">
          <div className="task-receiver-name">{order.receiver_name}</div>
          <button className="task-call-chip" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={12} /> {order.receiver_phone}
          </button>
        </div>

        <button className="task-address-row" onClick={() => openMaps(order.receiver_address)}>
          <FiMapPin size={13} className="task-info-icon text-muted" />
          <span className="task-address-text truncate">{order.receiver_address}</span>
          <FiNavigation size={12} className="task-nav-icon" />
        </button>

        <div className="task-meta-row">
          <span className="task-meta-chip task-meta-weight">
            <FiPackage size={11} /> {Number(order.weight || 0).toLocaleString()}g
          </span>
          {hasCod && <span className="task-meta-chip task-meta-cod">Thu: {Number(order.cod_amount).toLocaleString('vi-VN')}d</span>}
          {order.province && (
            <span className="task-meta-chip">
              <FiMapPin size={11} /> {order.district}, {order.province}
            </span>
          )}
        </div>

        <div className="task-actions">
          <button className="task-btn task-btn-call" onClick={() => callPhone(order.receiver_phone)}>
            <FiPhone size={14} /> Goi khach
          </button>
          <button className="task-btn task-btn-map" onClick={() => openMaps(order.receiver_address)}>
            <FiNavigation size={14} /> Chi duong
          </button>
          <button className="task-btn task-btn-scan" onClick={() => scanOrder(order.tracking_code, 'deliver')}>
            <FiChevronRight size={14} /> Cap nhat
          </button>
        </div>
      </div>
    );
  };

  const renderToWarehouseCard = (order: Order) => {
    const hasCod = Number(order.cod_amount) > 0;

    return (
      <div className="task-card animate-fade-in task-card-warehouse" key={order.tracking_code}>
        <div className="task-card-header">
          <div>
            <div className="task-track-code">{order.tracking_code}</div>
            {order.created_at && (
              <div className="task-time">
                <FiClock size={10} /> {timeAgo(order.created_at)}
              </div>
            )}
          </div>
          <span className="badge badge-warehouse">Ve kho</span>
        </div>

        <div className="task-info-row">
          <FiPackage size={13} className="task-info-icon" />
          <span className="task-store-name">{order.store_name || 'Shop'}</span>
        </div>

        <button className="task-address-row" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
          <FiMapPin size={13} className="task-info-icon text-muted" />
          <span className="task-address-text truncate">{order.pickup_address || 'Dia chi lay hang...'}</span>
          <FiNavigation size={12} className="task-nav-icon" />
        </button>

        <div className="task-meta-row">
          <span className="task-meta-chip task-meta-weight">
            <FiPackage size={11} /> {Number(order.weight || 0).toLocaleString()}g
          </span>
          {hasCod && <span className="task-meta-chip task-meta-cod">COD: {Number(order.cod_amount).toLocaleString('vi-VN')}d</span>}
          {order.dest_hub_name && (
            <span className="task-meta-chip task-meta-warehouse">
              <FiMapPin size={11} /> Ve {order.dest_hub_name}
            </span>
          )}
        </div>

        {renderRouteSteps(order, 'to-warehouse')}

        <div className="task-warehouse-note">
          Don da duoc lay xong va dang cho mang ve kho. Khi thu kho quet nhap kho, don se tu dong bien mat khoi muc nay.
        </div>

        <div className="task-actions">
          <button className="task-btn task-btn-call" onClick={() => callPhone(order.pickup_phone || order.receiver_phone)}>
            <FiPhone size={14} /> Goi Shop
          </button>
          <button className="task-btn task-btn-map" onClick={() => openMaps(order.pickup_address || order.receiver_address)}>
            <FiNavigation size={14} /> Chi duong
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div className="tasks-header-top">
          <div>
            <h2 className="tasks-title">Lich Trinh Hom Nay</h2>
            {spokeName && (
              <p className="tasks-spoke">
                <FiMapPin size={11} /> {spokeName}
              </p>
            )}
          </div>
          <button className="tasks-refresh" onClick={fetchTasks} aria-label="Lam moi">
            <FiRefreshCw size={16} />
          </button>
        </div>

        <div className="tasks-tabs">
          <button className={`tasks-tab${tab === 'pickup' ? ' active' : ''}`} onClick={() => switchTab('pickup')}>
            Lay hang
            <span className="tasks-tab-count">{pickups.length}</span>
          </button>
          <button className={`tasks-tab${tab === 'to-warehouse' ? ' active' : ''}`} onClick={() => switchTab('to-warehouse')}>
            Ve kho
            <span className="tasks-tab-count">{toWarehouseOrders.length}</span>
          </button>
          <button className={`tasks-tab${tab === 'delivery' ? ' active' : ''}`} onClick={() => switchTab('delivery')}>
            Giao hang
            <span className="tasks-tab-count">{deliveries.length}</span>
          </button>
        </div>

        <div className="tasks-search-row">
          <div className="tasks-search-wrap">
            <FiSearch size={15} className="tasks-search-icon" />
            <input
              className="tasks-search-input"
              type="search"
              placeholder={tab === 'pickup' || tab === 'to-warehouse' ? 'Tim ma / ten shop...' : 'Tim ma / ten khach...'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button className="tasks-search-clear" onClick={() => setSearch('')}>
                <FiX size={14} />
              </button>
            )}
          </div>
          <button className={`tasks-filter-btn${filterCod ? ' active' : ''}`} onClick={() => setFilterCod((value) => !value)}>
            COD
          </button>
        </div>
      </div>

      <div className="tasks-content">
        {loading ? (
          <div className="spinner-center">
            <div className="spinner" />
            Dang tai danh sach...
          </div>
        ) : tab === 'pickup' ? (
          filteredPickups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>{search ? 'Khong tim thay ket qua' : 'Khong co don can lay hang'}</p>
              <span>Khu vuc cua ban hien da xu ly het</span>
            </div>
          ) : (
            <div className="tasks-list">
              {filteredPickups.map((order) => renderPickupCard(order))}
              <div className="tasks-footer">
                <FiClock size={11} /> {filteredPickups.length} don · Cap nhat {new Date().toLocaleTimeString('vi-VN')}
              </div>
            </div>
          )
        ) : tab === 'to-warehouse' ? (
          filteredToWarehouse.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏬</div>
              <p>{search ? 'Khong tim thay ket qua' : 'Khong co don dang mang ve kho'}</p>
              <span>Cac don da lay xong va chua nhap kho se hien o day</span>
            </div>
          ) : (
            <div className="tasks-list">
              {filteredToWarehouse.map((order) => renderToWarehouseCard(order))}
              <div className="tasks-footer">
                <FiClock size={11} /> {filteredToWarehouse.length} don · Cap nhat {new Date().toLocaleTimeString('vi-VN')}
              </div>
            </div>
          )
        ) : filteredDeliveries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛵</div>
            <p>{search ? 'Khong tim thay ket qua' : 'Khong co don can giao'}</p>
            <span>Lich giao hang cua ban trong</span>
          </div>
        ) : (
          <div className="tasks-list">
            {inTransit.length > 0 && (
              <>
                <div className="tasks-group-label">Dang tren duong giao ({inTransit.length})</div>
                {inTransit.map((order) => renderDeliveryCard(order))}
              </>
            )}
            {toRedeliver.length > 0 && (
              <>
                <div className="tasks-group-label tasks-group-label-warn">Can giao lai ({toRedeliver.length})</div>
                {toRedeliver.map((order) => renderDeliveryCard(order))}
              </>
            )}
            <div className="tasks-footer">
              <FiClock size={11} /> {filteredDeliveries.length} don · Cap nhat {new Date().toLocaleTimeString('vi-VN')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
