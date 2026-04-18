import React, { useState, useEffect } from 'react';
import { FiNavigation, FiSearch, FiArrowRight, FiMapPin, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import apiClient from '../api/client';

interface RouteNode {
  id_route: number;
  origin_spoke: number;
  dest_spoke: number;
  origin_name: string;
  origin_hub: string;
  dest_name: string;
  dest_hub: string;
  distance_km: number;
  estimated_hours: number;
  is_active: boolean;
  route_type?: string;
}

interface RouteStop {
  id_stop: number;
  stop_order: number;
  stop_type: string;
  hub_name?: string;
  spoke_name?: string;
}

const Routes = () => {
  const [routes, setRoutes] = useState<RouteNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stopDetail, setStopDetail] = useState<RouteStop[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/routes');
      setRoutes(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (route: RouteNode) => {
    if (expandedId === route.id_route) {
      setExpandedId(null);
      setStopDetail([]);
      return;
    }
    setExpandedId(route.id_route);
    setLoadingDetail(true);
    try {
      const res: any = await apiClient.get(`/routes/${route.id_route}`);
      setStopDetail(res?.data?.nodes || []);
    } catch (err) {
      console.error(err);
      setStopDetail([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = routes.filter(r =>
    r.origin_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    r.origin_hub?.toLowerCase().includes(searchText.toLowerCase()) ||
    r.dest_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    r.dest_hub?.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalActive = routes.filter(r => r.is_active !== false).length;

  return (
    <div className="routes-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Mạng Lưới Tuyến Đường</h1>
          <p className="page-subtitle">Toàn bộ ma trận tuyến đường Hub-to-Hub trong hệ thống logistics.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tổng Tuyến</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}><FiNavigation /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{routes.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Đang Hoạt Động</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#d1fae5', color: '#047857' }}><FiNavigation /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{totalActive}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tạm Ngưng</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}><FiNavigation /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{routes.length - totalActive}</div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" className="form-control" placeholder="Tìm Hub xuất phát hoặc Hub đích..."
              style={{ paddingLeft: '36px' }}
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{filtered.length}/{routes.length} tuyến</span>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">Đang tải dữ liệu tuyến đường...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>ID</th>
                  <th style={{ width: '28%' }}>Bưu Cục QL (Xuất Phát)</th>
                  <th style={{ width: '5%' }}></th>
                  <th style={{ width: '28%' }}>Bưu Cục QL (Đích)</th>
                  <th style={{ width: '12%' }}>Tuyến Loại</th>
                  <th style={{ width: '10%' }}>Trạng thái</th>
                  <th style={{ width: '10%' }} className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(route => {
                  const isActive = route.is_active !== false;
                  return (
                  <React.Fragment key={route.id_route}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => handleExpand(route)}>
                      <td><span className="badge-id" style={{fontSize: 10}}>RT-{route.id_route}</span></td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <FiMapPin style={{ color: '#6d28d9', flexShrink: 0 }} />
                          <div>
                            <div style={{fontSize: 12}}>{route.origin_name || `BC-${route.origin_spoke}`}</div>
                            <div style={{fontSize: 10, color: '#6b7280', fontWeight: 500}}>Trực thuộc {route.origin_hub}</div>
                          </div>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: '#9ca3af' }}>
                        <FiArrowRight />
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <FiMapPin style={{ color: '#047857', flexShrink: 0 }} />
                          <div>
                            <div style={{fontSize: 12}}>{route.dest_name || `BC-${route.dest_spoke}`}</div>
                            <div style={{fontSize: 10, color: '#6b7280', fontWeight: 500}}>Trực thuộc {route.dest_hub}</div>
                          </div>
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
                        {route.route_type}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                          backgroundColor: isActive ? '#d1fae5' : '#f3f4f6',
                          color: isActive ? '#047857' : '#6b7280'
                        }}>
                          {isActive ? '● Hoạt động' : '○ Tạm ngưng'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="action-btn text-primary" title="Xem chặng dừng">
                          {expandedId === route.id_route ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === route.id_route && (
                      <tr key={`${route.id_route}-detail`}>
                        <td colSpan={7} style={{ backgroundColor: '#f9fafb', padding: '16px 24px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '12px', color: '#374151', fontSize: '0.9rem' }}>
                            📍 Các Chặng Dừng — Tuyến RT-{route.id_route}
                          </div>
                          {loadingDetail ? (
                            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Đang tải...</div>
                          ) : stopDetail.length > 0 ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {stopDetail.map((stop: any, idx: number) => (
                                  <span key={stop.id_route_node || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      backgroundColor: stop.location_type === 'HUB' ? '#ede9fe' : '#dbeafe',
                                      color: stop.location_type === 'HUB' ? '#6d28d9' : '#1d4ed8',
                                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                                    }}>
                                      {stop.location_type === 'HUB' ? '🏭' : '📍'} {stop.location_name}
                                    </span>
                                  {idx < stopDetail.length - 1 && <FiArrowRight style={{ color: '#9ca3af' }} />}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Không có dữ liệu chặng dừng cho tuyến này.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">Chưa có tuyến đường nào trong hệ thống.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Routes;
