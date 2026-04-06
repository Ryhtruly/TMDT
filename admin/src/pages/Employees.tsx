import { useState, useEffect } from 'react';
import { FiUserPlus, FiShield, FiKey, FiTrash2, FiUserX, FiSearch, FiUsers } from 'react-icons/fi';
import apiClient from '../api/client';
import Drawer from '../components/ui/Drawer';

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [roles, setRoles] = useState<{ id_role: number; role_name: string }[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'roles'>('list');

  const [formData, setFormData] = useState({
    phone: '', password: '', email: '', full_name: '', citizen_id: '',
    gender: 'Nam', dob: '', home_address: '', id_role: 1, id_hub: '', id_spoke: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ id_user: '', id_role: '' });

  useEffect(() => {
    fetchEmployees();
    apiClient.get('/admin/roles')
      .then(res => setRoles(res.data?.filter((r: any) => r.role_name !== 'SHOP') || []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const s = searchText.toLowerCase();
    setFiltered(employees.filter(e =>
      e.full_name?.toLowerCase().includes(s) ||
      e.email?.toLowerCase().includes(s) ||
      e.phone?.includes(s) ||
      e.roles?.join(' ').toLowerCase().includes(s)
    ));
  }, [searchText, employees]);

  const fetchEmployees = async () => {
    setListLoading(true);
    try {
      const res = await apiClient.get('/admin/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const handleDeactivate = async (id_user: number, name: string) => {
    if (!window.confirm(`Khóa tài khoản của ${name}? Họ sẽ không thể đăng nhập.`)) return;
    try {
      await apiClient.put(`/admin/employees/${id_user}/deactivate`);
      fetchEmployees();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        id_hub: formData.id_hub ? parseInt(formData.id_hub) : undefined,
        id_spoke: formData.id_spoke ? parseInt(formData.id_spoke) : undefined,
      };
      await apiClient.post('/admin/employees', payload);
      setMessage({ type: 'success', text: 'Thêm nhân sự thành công! Tài khoản đã được tạo.' });
      setFormData({ ...formData, phone: '', password: '', email: '', full_name: '', citizen_id: '', id_hub: '', id_spoke: '' });
      fetchEmployees();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setFormLoading(false);
    }
  };

  const grantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/user-roles', { id_user: parseInt(roleForm.id_user), id_role: parseInt(roleForm.id_role) });
      alert('Đã cấp quyền thành công!');
      setIsDrawerOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const revokeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.id_user || !roleForm.id_role) return alert('Nhập đủ ID Tài khoản và Role');
    try {
      await apiClient.delete('/admin/user-roles', { data: { id_user: parseInt(roleForm.id_user), id_role: parseInt(roleForm.id_role) } });
      alert('Đã tước quyền thành công!');
      setIsDrawerOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: '#7c3aed', SHIPPER: '#0891b2', STOCKKEEPER: '#b45309', SHOP: '#16a34a'
  };

  return (
    <div className="employees-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Quản Lý Nhân Sự & Phân Quyền</h1>
          <p className="page-subtitle">Tuyển dụng, quản lý danh sách và phân quyền hệ thống.</p>
        </div>
        <button className="btn-primary flex-center gap-2"
          style={{ backgroundColor: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
          onClick={() => setIsDrawerOpen(true)}>
          <FiKey /> Cấp / Tước Quyền
        </button>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            <FiUsers className="tab-icon" /> Danh Sách Nhân Viên ({employees.length})
          </button>
          <button className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <FiUserPlus className="tab-icon" /> Tuyển Dụng Mới
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <div style={{ padding: '16px 0 8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input type="text" className="form-control" placeholder="Tìm theo tên, email, SĐT, vai trò..."
                  style={{ paddingLeft: '36px' }}
                  value={searchText} onChange={e => setSearchText(e.target.value)} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Hiển thị {filtered.length}/{employees.length} nhân viên
              </span>
            </div>
            <div className="table-container">
              {listLoading ? <div className="loading-state">Đang tải danh sách nhân viên...</div> : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>ID</th>
                      <th style={{ width: '20%' }}>Họ và Tên</th>
                      <th style={{ width: '15%' }}>SĐT / Email</th>
                      <th style={{ width: '18%' }}>Vai trò (Roles)</th>
                      <th style={{ width: '17%' }}>Hub / Spoke</th>
                      <th style={{ width: '10%' }}>Trạng thái</th>
                      <th style={{ width: '15%' }} className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(emp => (
                      <tr key={emp.id_employee}>
                        <td><span className="badge-id">EMP-{emp.id_employee}</span></td>
                        <td>
                          <div className="font-medium">{emp.full_name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{emp.gender} · {emp.citizen_id}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>{emp.phone}</div>
                          <div style={{ color: '#6b7280' }}>{emp.email}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(emp.roles || []).map((r: string) => (
                              <span key={r} style={{
                                backgroundColor: roleColors[r] || '#6b7280', color: 'white',
                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700
                              }}>{r}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {emp.hub_name && <span style={{ color: '#7c3aed' }}>🏭 {emp.hub_name}</span>}
                          {emp.spoke_name && <span style={{ color: '#0891b2' }}>📍 {emp.spoke_name}</span>}
                          {!emp.hub_name && !emp.spoke_name && <span style={{ color: '#9ca3af' }}>Chưa phân công</span>}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                            backgroundColor: emp.is_active ? '#d1fae5' : '#fee2e2',
                            color: emp.is_active ? '#047857' : '#b91c1c'
                          }}>
                            {emp.is_active ? '● Hoạt động' : '● Đã khóa'}
                          </span>
                        </td>
                        <td className="text-right">
                          {emp.is_active && (
                            <button className="action-btn" style={{ color: '#ef4444' }}
                              title="Khóa tài khoản"
                              onClick={() => handleDeactivate(emp.id_user, emp.full_name)}>
                              <FiUserX />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="empty-state">Không tìm thấy nhân viên nào.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'create' && (
          <div style={{ maxWidth: '800px', padding: '16px 0' }}>
            {message && (
              <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: message.type === 'success' ? '#dcfce3' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#b91c1c' }}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Họ và Tên', name: 'full_name', type: 'text', placeholder: 'Nguyễn Văn A' },
                { label: 'SĐT (Login ID)', name: 'phone', type: 'text', placeholder: '09xxxxxxxx' },
                { label: 'Mật khẩu khởi tạo', name: 'password', type: 'password', placeholder: '' },
                { label: 'Email', name: 'email', type: 'email', placeholder: '' },
                { label: 'Số CCCD / CMND', name: 'citizen_id', type: 'text', placeholder: '079xxxxxxxxx' },
                { label: 'Ngày sinh', name: 'dob', type: 'date', placeholder: '' },
              ].map(f => (
                <div key={f.name} className="form-group">
                  <label>{f.label}</label>
                  <div className="input-wrapper">
                    <input type={f.type} name={f.name} required={f.name !== 'dob'}
                      value={(formData as any)[f.name]} onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })}
                      placeholder={f.placeholder} />
                  </div>
                </div>
              ))}

              <div className="form-group">
                <label>Giới tính</label>
                <div className="input-wrapper">
                  <select name="gender" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <option>Nam</option><option>Nữ</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Vai trò (Role)</label>
                <div className="input-wrapper">
                  <select name="id_role" value={formData.id_role} onChange={e => setFormData({ ...formData, id_role: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    {roles.map(r => <option key={r.id_role} value={r.id_role}>{r.role_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hub (bỏ trống nếu gắn Spoke)</label>
                <div className="input-wrapper"><input type="number" name="id_hub" value={formData.id_hub}
                  onChange={e => setFormData({ ...formData, id_hub: e.target.value })} placeholder="ID Hub" /></div>
              </div>

              <div className="form-group">
                <label>Spoke (bỏ trống nếu gắn Hub)</label>
                <div className="input-wrapper"><input type="number" name="id_spoke" value={formData.id_spoke}
                  onChange={e => setFormData({ ...formData, id_spoke: e.target.value })} placeholder="ID Spoke" /></div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div className="form-group">
                  <label>Địa chỉ nhà</label>
                  <div className="input-wrapper"><input type="text" name="home_address" value={formData.home_address}
                    onChange={e => setFormData({ ...formData, home_address: e.target.value })} placeholder="Số nhà, đường, quận..." /></div>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={formLoading}>
                  {formLoading ? 'Đang tạo tài khoản...' : '👤 Lưu Hồ Sơ Nhân Sự'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Quản trị Quyền (Cross-Roles)">
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', color: '#4b5563', fontSize: '0.9rem', marginBottom: '20px' }}>
          Gán hoặc thu hồi Role cho bất kỳ User nào trong hệ thống theo ID tài khoản.
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>ID Người Dùng (id_user)</label>
            <input type="number" required className="form-control" value={roleForm.id_user}
              onChange={e => setRoleForm({ ...roleForm, id_user: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Chọn Quyền (Role)</label>
            <select required className="form-control" value={roleForm.id_role}
              onChange={e => setRoleForm({ ...roleForm, id_role: e.target.value })}>
              <option value="">-- Chọn Role --</option>
              {roles.map(r => <option key={r.id_role} value={r.id_role}>{r.role_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary flex-center gap-2" style={{ flex: 1 }} onClick={grantRole}>
              <FiShield /> Cấp Quyền
            </button>
            <button className="btn-primary flex-center gap-2" style={{ flex: 1, backgroundColor: '#fee2e2', color: '#b91c1c' }} onClick={revokeRole}>
              <FiTrash2 /> Tước Quyền
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Employees;
