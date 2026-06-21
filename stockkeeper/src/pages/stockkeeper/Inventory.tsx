import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiBox,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCopy,
  FiMapPin,
  FiSearch,
  FiTruck,
} from 'react-icons/fi';
import api from '../../api/client';
import './Inventory.css';

interface InventoryItem {
  id_inventory: number;
  id_store?: number;
  id_dest_area?: number;
  tracking_code: string;
  warehouse_name: string;
  current_warehouse_name?: string;
  current_location_id?: number | null;
  current_hub_id?: number | null;
  current_spoke_id?: number | null;
  current_hub_name?: string | null;
  current_spoke_name?: string | null;
  current_spoke_hub_id?: number | null;
  current_spoke_hub_name?: string | null;
  dest_spoke_name?: string | null;
  dest_spoke_id?: number | null;
  dest_hub_name?: string | null;
  dest_hub_id?: number | null;
  shelf_location: string | null;
  entered_at: string;
  hours_in_warehouse: string;
  is_overdue: boolean;
  status: string;
  province?: string;
  district?: string;
  route_plan_nodes?: Array<{
    id_location?: number;
    location_name?: string;
    location_type?: string;
    stop_order?: number;
    is_intermediate?: boolean;
  }>;
}

interface RouteNode {
  key: string;
  label: string;
  meta: string;
  active: boolean;
  tone: 'completed' | 'current' | 'next' | 'final';
}

const normalizeName = (value?: string | null) => String(value || '').trim();

const pushNode = (
  nodes: RouteNode[],
  label: string,
  meta: string,
  active: boolean,
  tone: RouteNode['tone']
) => {
  const cleanLabel = normalizeName(label);
  if (!cleanLabel) return;
  const previous = nodes[nodes.length - 1];
  if (previous && previous.label === cleanLabel && previous.meta === meta) return;
  nodes.push({
    key: `${cleanLabel}-${meta}-${nodes.length}`,
    label: cleanLabel,
    meta,
    active,
    tone,
  });
};

const buildRouteNodes = (item: InventoryItem): RouteNode[] => {
  const routePlanNodes = Array.isArray(item.route_plan_nodes) ? item.route_plan_nodes : [];
  const currentLocationId = item.current_location_id ? Number(item.current_location_id) : null;
  const routePlanCurrentIndex = currentLocationId
    ? routePlanNodes.findIndex((node) => Number(node.id_location || 0) === currentLocationId)
    : -1;

  if (routePlanNodes.length > 0) {
    const nodes = routePlanNodes
      .map((node, index) => {
        const isCurrent = routePlanCurrentIndex >= 0 && index === routePlanCurrentIndex;
        const isCompleted = routePlanCurrentIndex > index;
        const tone: RouteNode['tone'] = isCurrent ? 'current' : isCompleted ? 'completed' : 'next';
        const meta = isCurrent
          ? 'Dang o day'
          : isCompleted
            ? 'Da di qua'
            : node.location_type === 'HUB'
              ? 'Kho trung chuyen tiep theo'
              : 'Buu cuc / diem trung chuyen tiep theo';

        return {
          key: `${normalizeName(node.location_name)}-${node.id_location || index}`,
          label: normalizeName(node.location_name || `Node ${index + 1}`),
          meta,
          active: isCurrent || isCompleted,
          tone,
        };
      })
      .filter((node) => node.label);

    pushNode(nodes, 'Shipper nhan hang', 'Giao cho shipper khu vuc de di giao', false, 'final');
    return nodes;
  }

  const nodes: RouteNode[] = [];
  const currentWarehouse = normalizeName(item.current_warehouse_name || item.warehouse_name || 'Kho hien tai');
  const currentHub = normalizeName(item.current_hub_name || item.current_spoke_hub_name);
  const destHub = normalizeName(item.dest_hub_name);
  const destSpoke = normalizeName(item.dest_spoke_name);

  pushNode(nodes, currentWarehouse, 'Dang o day', true, 'current');

  if (item.current_spoke_id) {
    if (currentHub && currentHub !== currentWarehouse) {
      pushNode(nodes, currentHub, 'Trung chuyen roi kho spoke', false, 'next');
    }

    if (destHub && destHub !== currentHub && destHub !== currentWarehouse) {
      pushNode(nodes, destHub, 'Kho tong dich / hub tiep theo', false, 'next');
    }

    if (destSpoke && destSpoke !== currentWarehouse) {
      pushNode(nodes, destSpoke, 'Buu cuc giao cuoi chang', false, 'next');
    }
  } else if (item.current_hub_id) {
    if (destHub && destHub !== currentWarehouse) {
      pushNode(nodes, destHub, 'Kho tong dich / hub tiep theo', false, 'next');
    }

    if (destSpoke) {
      pushNode(nodes, destSpoke, 'Buu cuc giao cuoi chang', false, 'next');
    }
  }

  pushNode(nodes, 'Shipper nhan hang', 'Giao cho shipper khu vuc de di giao', false, 'final');

  return nodes;
};

const getInventoryRouteContext = (item: InventoryItem) => {
  const routePlanNodes = Array.isArray(item.route_plan_nodes) ? item.route_plan_nodes : [];
  const currentLocationId = item.current_location_id ? Number(item.current_location_id) : null;
  const currentIndex = currentLocationId
    ? routePlanNodes.findIndex((node) => Number(node.id_location || 0) === currentLocationId)
    : -1;

  return {
    previousPoint: currentIndex > 0 ? normalizeName(routePlanNodes[currentIndex - 1]?.location_name) : '',
    destinationPoint:
      currentIndex >= 0
        ? normalizeName(
            routePlanNodes[currentIndex + 1]?.location_name ||
              routePlanNodes[routePlanNodes.length - 1]?.location_name
          )
        : normalizeName(item.dest_spoke_name || item.dest_hub_name || ''),
  };
};

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map((value) => normalizeName(value)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'vi')
  );

const InventoryCard = ({
  item,
  isDanger = false,
  expanded,
  copied,
  onToggle,
  onCopy,
}: {
  item: InventoryItem;
  isDanger?: boolean;
  expanded: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: (trackingCode: string) => void;
}) => {
  const destInfo = item.province ? `${item.district || ''}, ${item.province}` : 'Noi bo khu vuc';
  const routeNodes = buildRouteNodes(item);

  return (
    <div className={`inv-card ${isDanger ? 'inv-card-danger' : ''} ${expanded ? 'inv-card-expanded' : ''}`}>
      <button
        className={`inv-copy-btn ${copied ? 'copied' : ''}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCopy(item.tracking_code);
        }}
        title={copied ? 'Da copy ma van don' : 'Copy ma van don'}
      >
        <FiCopy size={14} />
        <span>{copied ? 'Da copy' : 'Copy'}</span>
      </button>

      <button className="inv-card-toggle" onClick={onToggle} type="button">
        <div className="inv-card-header">
          <div className="inv-code">Ma: {item.tracking_code}</div>
          <div className="inv-header-side">
            <div className="inv-time">
              <FiClock size={12} />
              {item.hours_in_warehouse}h
            </div>
            <div className="inv-expand-icon">{expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}</div>
          </div>
        </div>

        <div className="inv-card-body">
          <div className="inv-row">
            <span className="inv-lbl">Dang o kho:</span>
            <span className="inv-val highlight">
              {item.current_warehouse_name || item.warehouse_name || 'Chua xac dinh'}
            </span>
          </div>
          <div className="inv-row">
            <span className="inv-lbl">Vi tri ke:</span>
            <span className="inv-val highlight">{item.shelf_location || 'Chua xep ke'}</span>
          </div>
          <div className="inv-row">
            <span className="inv-lbl">Chuyen tiep:</span>
            <span className="inv-val flex-val">
              <FiTruck size={12} />
              {destInfo}
            </span>
          </div>
          <div className="inv-row muted">
            <span className="inv-lbl">Nhap luc:</span>
            <span className="inv-val">{new Date(item.entered_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="inv-route-panel">
          <div className="inv-route-title">Cay trang thai kho va diem den</div>
          <div className="inv-route-list">
            {routeNodes.map((node, index) => (
              <div className={`inv-route-item ${node.active ? 'active' : ''}`} key={node.key}>
                <div className={`inv-route-dot ${node.tone}`} />
                {index < routeNodes.length - 1 && <div className="inv-route-line" />}
                <div className="inv-route-content">
                  <div className="inv-route-label">{node.label}</div>
                  <div className="inv-route-meta">{node.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouseTitle, setWarehouseTitle] = useState('');
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [expandedTracking, setExpandedTracking] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previousFilter, setPreviousFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const [invRes, alertRes]: [any, any] = await Promise.all([
          api.get('/stockkeeper/inventory').catch(() => null),
          api.get('/stockkeeper/alerts').catch(() => null),
        ]);

        const invData = invRes?.data || {};
        const alertData = alertRes?.data || {};

        setWarehouseTitle(invData.warehouse || 'Kho hien tai');
        setInventory(invData.items || []);
        setAlerts(alertData.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const matchesInventoryFilters = (item: InventoryItem) => {
    const tracking = String(item.tracking_code || '').toLowerCase();
    const context = getInventoryRouteContext(item);
    const matchesTracking = !searchTerm || tracking.includes(searchTerm.toLowerCase().trim());
    const matchesPrevious = !previousFilter || context.previousPoint === previousFilter;
    const matchesDestination = !destinationFilter || context.destinationPoint === destinationFilter;
    return matchesTracking && matchesPrevious && matchesDestination;
  };

  const previousOptions = uniqueSorted([...inventory, ...alerts].map((item) => getInventoryRouteContext(item).previousPoint));
  const destinationOptions = uniqueSorted(
    [...inventory, ...alerts].map((item) => getInventoryRouteContext(item).destinationPoint)
  );
  const normalItems = inventory.filter((item) => !item.is_overdue);
  const filteredAlerts = alerts.filter(matchesInventoryFilters);
  const filteredNormalItems = normalItems.filter(matchesInventoryFilters);

  const copyTrackingCode = async (trackingCode: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingCode);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = trackingCode;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setCopiedTracking(trackingCode);
      window.setTimeout(() => {
        setCopiedTracking((current) => (current === trackingCode ? null : current));
      }, 1600);
    } catch (error) {
      console.error('Khong the copy ma van don:', error);
    }
  };

  return (
    <div className="inventory-page">
      <div className="inv-hero">
        <div className="inv-hero-content">
          <h1 className="inv-title">Quan ly Ton kho</h1>
          <div className="inv-sub-location">
            <FiMapPin size={14} />
            {warehouseTitle}
          </div>
        </div>

        <div className="inv-stats-cards">
          <div className="inv-stat-card">
            <div className="inv-stat-icon safe">
              <FiBox size={20} />
            </div>
            <div className="inv-stat-info">
              <span className="inv-stat-val">{inventory.length}</span>
              <span className="inv-stat-lbl">Tong cuc hang</span>
            </div>
          </div>

          <div className={`inv-stat-card ${alerts.length > 0 ? 'alerting' : ''}`}>
            <div className="inv-stat-icon warn">
              <FiAlertTriangle size={20} />
            </div>
            <div className="inv-stat-info">
              <span className="inv-stat-val">{alerts.length}</span>
              <span className="inv-stat-lbl">Ton qua 24h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="inv-filter-bar">
        <div className="inv-search-box">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Tim theo ma van don..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <select className="inv-filter-select" value={previousFilter} onChange={(event) => setPreviousFilter(event.target.value)}>
          <option value="">Tat ca diem truoc do</option>
          {previousOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="inv-filter-select"
          value={destinationFilter}
          onChange={(event) => setDestinationFilter(event.target.value)}
        >
          <option value="">Tat ca diem dich</option>
          {destinationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="inv-body">
        {loading ? (
          <div className="inv-loading">
            <span className="spinner" />
            Dang tai du lieu kho...
          </div>
        ) : (
          <>
            {alerts.length > 0 && (
              <div className="inv-section">
                <div className="inv-section-title danger">
                  <FiAlertTriangle />
                  <span>Canh bao Xa kho ({filteredAlerts.length})</span>
                </div>
                <div className="inv-list">
                  {filteredAlerts.map((item) => (
                    <InventoryCard
                      key={item.id_inventory}
                      item={item}
                      isDanger
                      expanded={expandedTracking === item.tracking_code}
                      copied={copiedTracking === item.tracking_code}
                      onCopy={copyTrackingCode}
                      onToggle={() =>
                        setExpandedTracking((previous) =>
                          previous === item.tracking_code ? null : item.tracking_code
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="inv-section">
              <div className="inv-section-title">
                <FiBox />
                <span>Danh sach hang tai kho ({filteredNormalItems.length})</span>
              </div>

              {filteredNormalItems.length === 0 ? (
                <div className="inv-empty">Khong co don nao phu hop voi bo loc hien tai.</div>
              ) : (
                <div className="inv-list">
                  {filteredNormalItems.map((item) => (
                    <InventoryCard
                      key={item.id_inventory}
                      item={item}
                      expanded={expandedTracking === item.tracking_code}
                      copied={copiedTracking === item.tracking_code}
                      onCopy={copyTrackingCode}
                      onToggle={() =>
                        setExpandedTracking((previous) =>
                          previous === item.tracking_code ? null : item.tracking_code
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inventory;
