import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiBell, FiLogOut, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';

const Header = () => {
  const { user, logout } = useAuth();
  const [showNoti, setShowNoti] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notiRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      if (res.data && res.data.data) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter((n: any) => !n.is_read).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      loadNotifications();
    } catch (e) {}
  };
  
  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      loadNotifications();
    } catch (e) {}
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNoti(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="admin-header">
      <div className="header-search">
        <FiSearch className="search-icon" />
        <input type="text" placeholder="Tìm kiếm vận đơn, thông tin kho..." />
      </div>

      <div className="header-actions">
        <div style={{ position: 'relative' }} ref={notiRef}>
          <button className="icon-btn" onClick={() => setShowNoti(!showNoti)}>
            <FiBell />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {showNoti && (
            <div style={{
              position: 'absolute', top: '40px', right: '-10px', width: '320px', 
              backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid var(--slate-200)', zIndex: 1000, overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200)', fontWeight: 600, backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                <span>Thông báo hệ thống</span>
                <span onClick={handleMarkAllRead} style={{ fontSize: '12px', color: 'var(--primary-color)', cursor: 'pointer' }}>Đánh dấu đã đọc</span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 && <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px'}}>Không có thông báo mới</div>}
                {notifications.map((n, i) => (
                  <div key={i} onClick={() => !n.is_read && handleMarkAsRead(n.id_noti)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-100)', display: 'flex', gap: '12px', cursor: 'pointer', backgroundColor: n.is_read ? 'transparent' : '#fffbeb' }} className="hover-bg-slate-50">
                    <FiAlertCircle style={{ color: n.is_read ? '#94a3b8' : '#f59e0b', marginTop: '2px', fontSize: '16px', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--slate-700)', fontWeight: n.is_read ? 400 : 500, lineHeight: 1.4 }}>{n.title}: {n.content}</p>
                      <p style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px', textAlign: 'center', backgroundColor: '#f8fafc', borderTop: '1px solid var(--slate-200)', fontSize: '13px', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }}>
                Xem tất cả thông báo
              </div>
            </div>
          )}
        </div>
        
        <div className="user-profile">
          <div className="avatar">{user?.display_name?.charAt(0) || 'A'}</div>
          <div className="user-info">
            <span className="user-name">{user?.display_name || 'Admin'}</span>
            <span className="user-role">{user?.roles[0] || 'ADMIN'}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Đăng xuất">
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
