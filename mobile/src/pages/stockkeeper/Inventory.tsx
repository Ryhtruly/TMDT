import { useState, useEffect } from 'react';
import { FiBox, FiClock, FiAlertTriangle, FiMapPin, FiTruck } from 'react-icons/fi';
import api from '../../api/client';
import './Inventory.css';

interface InventoryItem {
  id_inventory: number;
  tracking_code: string;
  warehouse_name: string;
  shelf_location: string | null;
  entered_at: string;
  hours_in_warehouse: string;
  is_overdue: boolean;
  status: string;
  province?: string;
  district?: string;
}

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouseTitle, setWarehouseTitle] = useState('');
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, alertRes]: [any, any] = await Promise.all([
        api.get('/stockkeeper/inventory').catch(() => null),
        api.get('/stockkeeper/alerts').catch(() => null),
      ]);

      const invData = invRes?.data || {};
      const alertData = alertRes?.data || {};

      setWarehouseTitle(invData.warehouse || 'Kho hiện tại');
      setInventory(invData.items || []);
      setAlerts(alertData.items || []);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter normal items
  const normalItems = inventory.filter(i => !i.is_overdue);

  return (
    <div className="inventory-page">
      {/* Header Info */}
      <div className="inv-hero">
        <div className="inv-hero-content">
          <h1 className="inv-title">Quản lý Tồn kho</h1>
          <div className="inv-sub-location">
            <FiMapPin size={14} />
            {warehouseTitle}
          </div>
          
          <div className="inv-stats-cards">
            <div className="inv-stat-card">
              <div className="inv-stat-icon safe"><FiBox size={20} /></div>
              <div className="inv-stat-info">
                <span className="inv-stat-val">{inventory.length}</span>
                <span className="inv-stat-lbl">Tổng cục hàng</span>
              </div>
            </div>
            
            <div className={`inv-stat-card ${alerts.length > 0 ? 'alerting' : ''}`}>
              <div className="inv-stat-icon warn"><FiAlertTriangle size={20} /></div>
              <div className="inv-stat-info">
                <span className="inv-stat-val">{alerts.length}</span>
                <span className="inv-stat-lbl">Tồn quá 24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="inv-body">
        {loading ? (
          <div className="inv-loading">
            <span className="spinner" />
            Đang tải dữ liệu kho...
          </div>
        ) : (
          <>
            {/* OVERDUE ALERTS SECTION */}
            {alerts.length > 0 && (
              <div className="inv-section">
                <div className="inv-section-title danger">
                  <FiAlertTriangle />
                  <span>Cảnh báo Xả kho ({alerts.length})</span>
                </div>
                <div className="inv-list">
                  {alerts.map(item => (
                    <InventoryCard key={item.id_inventory} item={item} isDanger />
                  ))}
                </div>
              </div>
            )}

            {/* NORMAL INVENTORY SECTION */}
            <div className="inv-section">
              <div className="inv-section-title">
                <FiBox />
                <span>Danh sách hàng tại kho ({normalItems.length})</span>
              </div>
              
              {normalItems.length === 0 ? (
                <div className="inv-empty">
                  Kho hiện tại không có hàng lưu trữ.
                </div>
              ) : (
                <div className="inv-list">
                  {normalItems.map(item => (
                    <InventoryCard key={item.id_inventory} item={item} />
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

const InventoryCard = ({ item, isDanger = false }: { item: InventoryItem; isDanger?: boolean }) => {
  // Destination info logic
  const destInfo = item.province ? `${item.district || ''}, ${item.province}` : 'Nội bộ khu vực';

  return (
    <div className={`inv-card ${isDanger ? 'inv-card-danger' : ''}`}>
      <div className="inv-card-header">
        <div className="inv-code">📦 {item.tracking_code}</div>
        <div className="inv-time">
          <FiClock size={12} />
          {item.hours_in_warehouse}h
        </div>
      </div>
      
      <div className="inv-card-body">
        <div className="inv-row">
          <span className="inv-lbl">Vị trí kệ:</span>
          <span className="inv-val highlight">
            {item.shelf_location || 'Chưa xếp kệ'}
          </span>
        </div>
        <div className="inv-row">
          <span className="inv-lbl">Chuyển tiếp:</span>
          <span className="inv-val flex-val">
            <FiTruck size={12} />
            {destInfo}
          </span>
        </div>
        <div className="inv-row muted">
          <span className="inv-lbl">Nhập lúc:</span>
          <span className="inv-val">
            {new Date(item.entered_at).toLocaleString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
