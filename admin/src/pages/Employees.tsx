import { useEffect, useState } from 'react';
import {
  FiKey,
  FiMapPin,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUserX,
  FiUsers,
} from 'react-icons/fi';
import apiClient from '../api/client';
import Drawer from '../components/ui/Drawer';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../utils/phone';

const roleColors: Record<string, string> = {
  ADMIN: '#7c3aed',
  SHIPPER: '#0891b2',
  STOCKKEEPER: '#b45309',
  SHOP: '#16a34a',
};

const stripVietnamese = (value: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const normalizeProvinceName = (value: string) => {
  const normalized = stripVietnamese(value)
    .toLowerCase()
    .replace(/^thanh pho\s+/i, '')
    .replace(/^tp\.\s*/i, '')
    .replace(/^tp\s+/i, '')
    .replace(/^tinh\s+/i, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (['ho chi minh', 'hcm', 'tphcm', 'tp hcm'].includes(normalized)) return 'ho chi minh';
  if (['ha noi', 'tphn', 'tp hn'].includes(normalized)) return 'ha noi';

  return normalized;
};

const normalizeDistrictName = (value: string) =>
  stripVietnamese(value)
    .toLowerCase()
    .replace(/^quan\s+/i, '')
    .replace(/^q\.\s*/i, '')
    .replace(/^q\s+/i, '')
    .replace(/^huyen\s+/i, '')
    .replace(/^h\.\s*/i, '')
    .replace(/^h\s+/i, '')
    .replace(/^thi xa\s+/i, '')
    .replace(/^tx\.\s*/i, '')
    .replace(/^thi tran\s+/i, '')
    .replace(/^thanh pho\s+/i, '')
    .replace(/^tp\.\s*/i, '')
    .replace(/^tp\s+/i, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [spokes, setSpokes] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [roles, setRoles] = useState<{ id_role: number; role_name: string }[]>([]);
  const [wardAssignments, setWardAssignments] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districtOptions, setDistrictOptions] = useState<any[]>([]);
  const [wardOptions, setWardOptions] = useState<any[]>([]);
  const [shipperSearchText, setShipperSearchText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'zones'>('list');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    email: '',
    full_name: '',
    citizen_id: '',
    gender: 'Nam',
    dob: '',
    home_address: '',
    id_role: 1,
    id_hub: '',
    id_spoke: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [zoneForm, setZoneForm] = useState({
    id_shipper: '',
    id_spoke: '',
    province: '',
    district: '',
    ward: '',
    priority: '100',
  });
  const [zoneLoading, setZoneLoading] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ id_user: '', id_role: '' });

  const selectedRoleName = roles.find((r) => r.id_role === formData.id_role)?.role_name || '';
  const isHubDisabled = selectedRoleName === 'ADMIN' || selectedRoleName === 'SHIPPER' || (selectedRoleName === 'STOCKKEEPER' && formData.id_spoke !== '');
  const isSpokeDisabled = selectedRoleName === 'ADMIN' || (selectedRoleName === 'STOCKKEEPER' && formData.id_hub !== '');

  const shippers = employees.filter((employee) => (employee.roles || []).includes('SHIPPER'));
  const selectedZoneSpokeId = zoneForm.id_spoke ? parseInt(zoneForm.id_spoke, 10) : null;
  const spokeAreas = selectedZoneSpokeId ? areas.filter((area) => area.id_spoke === selectedZoneSpokeId) : [];
  const provinceOptions = Array.from(new Set(spokeAreas.map((area) => area.province))).sort();
  const fixedProvince = provinceOptions.length === 1 ? provinceOptions[0] : '';
  const effectiveProvince = fixedProvince || zoneForm.province;
  const selectedProvinceCoverage = effectiveProvince
    ? spokeAreas.filter((area) => normalizeProvinceName(area.province) === normalizeProvinceName(effectiveProvince))
    : spokeAreas;
  const districtOptionsBySpoke = Array.from(new Set(selectedProvinceCoverage.map((area) => area.district))).sort();
  const fixedDistrict = districtOptionsBySpoke.length === 1 ? districtOptionsBySpoke[0] : '';
  const effectiveDistrict = fixedDistrict || zoneForm.district;
  const shipperOptions = selectedZoneSpokeId
    ? shippers.filter((employee) => String(employee.id_spoke || '') === String(selectedZoneSpokeId))
    : shippers;
  const visibleShipperOptions = shipperOptions.filter((employee) => {
    const q = shipperSearchText.trim().toLowerCase();
    if (!q) return true;
    return (
      employee.full_name?.toLowerCase().includes(q) ||
      employee.phone?.toLowerCase().includes(q) ||
      employee.email?.toLowerCase().includes(q)
    );
  });
  const visibleWardOptions = wardOptions.filter((ward) => {
    const q = zoneForm.ward.trim().toLowerCase();
    if (!q) return true;
    return ward.name?.toLowerCase().includes(q);
  });

  useEffect(() => {
    fetchEmployees();
    fetchWardAssignments();
    apiClient
      .get('/admin/roles')
      .then((res: any) => setRoles((res.data || []).filter((role: any) => role.role_name !== 'SHOP')))
      .catch((err) => console.error(err));
    apiClient
      .get('/admin/infrastructure')
      .then((res: any) => {
        setHubs(res.data?.hubs || []);
        setSpokes(res.data?.spokes || []);
        setAreas(res.data?.areas || []);
      })
      .catch((err) => console.error(err));
    fetch('https://provinces.open-api.vn/api/p/')
      .then((res) => res.json())
      .then(setProvinces)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!zoneForm.id_spoke) return;
    setZoneForm((prev) => ({ ...prev, id_shipper: '', province: '', district: '', ward: '' }));
    setShipperSearchText('');
    setDistrictOptions([]);
    setWardOptions([]);
  }, [zoneForm.id_spoke]);

  useEffect(() => {
    setDistrictOptions([]);
    setWardOptions([]);
    if (!effectiveProvince) return;

    const province = provinces.find(
      (item) => normalizeProvinceName(item.name) === normalizeProvinceName(effectiveProvince)
    );
    if (!province?.code) return;

    fetch(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`)
      .then((res) => res.json())
      .then((data) => {
        const nextDistricts = (data.districts || []).filter((district: any) =>
          districtOptionsBySpoke.some(
            (coveredDistrict) => normalizeDistrictName(coveredDistrict) === normalizeDistrictName(district.name)
          )
        );
        setDistrictOptions(nextDistricts);
      })
      .catch((err) => console.error(err));
  }, [effectiveProvince, zoneForm.id_spoke, provinces, districtOptionsBySpoke.join('|')]);

  useEffect(() => {
    setWardOptions([]);
    if (!effectiveDistrict) return;

    const loadWards = async () => {
      let districtCode =
        districtOptions.find((item) => normalizeDistrictName(item.name) === normalizeDistrictName(effectiveDistrict))
          ?.code || null;

      if (!districtCode && effectiveProvince) {
        const province = provinces.find(
          (item) => normalizeProvinceName(item.name) === normalizeProvinceName(effectiveProvince)
        );
        if (province?.code) {
          const response = await fetch(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`);
          const data = await response.json();
          districtCode =
            (data.districts || []).find(
              (item: any) => normalizeDistrictName(item.name) === normalizeDistrictName(effectiveDistrict)
            )?.code || null;
        }
      }

      if (!districtCode) return;

      const wardResponse = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
      const wardData = await wardResponse.json();
      setWardOptions(wardData.wards || []);
    };

    loadWards().catch((err) => console.error(err));
  }, [effectiveDistrict, effectiveProvince, districtOptions, provinces]);

  useEffect(() => {
    const q = searchText.toLowerCase();
    setFiltered(
      employees.filter(
        (employee) =>
          employee.full_name?.toLowerCase().includes(q) ||
          employee.email?.toLowerCase().includes(q) ||
          employee.phone?.includes(q) ||
          (employee.roles || []).join(' ').toLowerCase().includes(q)
      )
    );
  }, [employees, searchText]);

  const fetchEmployees = async () => {
    setListLoading(true);
    try {
      const res: any = await apiClient.get('/admin/employees');
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const fetchWardAssignments = async () => {
    try {
      const res: any = await apiClient.get('/admin/shipper-ward-assignments');
      setWardAssignments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async (id_user: number, name: string) => {
    if (!window.confirm(`Khoa tai khoan cua ${name}?`)) return;
    try {
      await apiClient.put(`/admin/employees/${id_user}/deactivate`);
      fetchEmployees();
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage(null);
    const normalizedPhone = normalizeVietnamPhone(formData.phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      setMessage({ type: 'error', text: vietnamPhoneError });
      setFormLoading(false);
      return;
    }
    try {
      await apiClient.post('/admin/employees', {
        ...formData,
        phone: normalizedPhone,
        id_hub: formData.id_hub ? parseInt(formData.id_hub, 10) : undefined,
        id_spoke: formData.id_spoke ? parseInt(formData.id_spoke, 10) : undefined,
      });
      setMessage({ type: 'success', text: 'Them nhan su thanh cong.' });
      setFormData({
        phone: '',
        password: '',
        email: '',
        full_name: '',
        citizen_id: '',
        gender: 'Nam',
        dob: '',
        home_address: '',
        id_role: 1,
        id_hub: '',
        id_spoke: '',
      });
      fetchEmployees();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Co loi xay ra.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setZoneLoading(true);
    try {
      await apiClient.post('/admin/shipper-ward-assignments', {
        id_shipper: parseInt(zoneForm.id_shipper, 10),
        id_spoke: parseInt(zoneForm.id_spoke, 10),
        province: effectiveProvince,
        district: effectiveDistrict,
        ward: zoneForm.ward || '',
        priority: parseInt(zoneForm.priority || '100', 10),
      });
      setZoneForm({
        id_shipper: '',
        id_spoke: '',
        province: '',
        district: '',
        ward: '',
        priority: '100',
      });
      setDistrictOptions([]);
      setWardOptions([]);
      fetchWardAssignments();
      alert('Da tao phan khu shipper.');
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    } finally {
      setZoneLoading(false);
    }
  };

  const handleDeleteZone = async (id_assignment: number) => {
    if (!window.confirm(`Xoa phan khu #${id_assignment}?`)) return;
    try {
      await apiClient.delete(`/admin/shipper-ward-assignments/${id_assignment}`);
      fetchWardAssignments();
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    }
  };

  const grantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/user-roles', {
        id_user: parseInt(roleForm.id_user, 10),
        id_role: parseInt(roleForm.id_role, 10),
      });
      alert('Da cap quyen thanh cong.');
      setIsDrawerOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    }
  };

  const revokeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.delete('/admin/user-roles', {
        data: { id_user: parseInt(roleForm.id_user, 10), id_role: parseInt(roleForm.id_role, 10) },
      });
      alert('Da thu hoi quyen thanh cong.');
      setIsDrawerOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="employees-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Quan Ly Nhan Su va Phan Quyen</h1>
          <p className="page-subtitle">Nhan su, role va phan khu shipper theo phuong.</p>
        </div>
        <button
          className="btn-primary flex-center gap-2"
          style={{ backgroundColor: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
          onClick={() => setIsDrawerOpen(true)}
        >
          <FiKey /> Cap / Tuoc Quyen
        </button>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            <FiUsers className="tab-icon" /> Danh Sach Nhan Vien ({employees.length})
          </button>
          <button className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <FiUserPlus className="tab-icon" /> Tuyen Dung Moi
          </button>
          <button className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`} onClick={() => setActiveTab('zones')}>
            <FiMapPin className="tab-icon" /> Phan Khu Shipper ({wardAssignments.length})
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <div style={{ padding: '16px 0 8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <FiSearch
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tim theo ten, email, SDT, vai tro..."
                  style={{ paddingLeft: '36px' }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Hien thi {filtered.length}/{employees.length} nhan vien
              </span>
            </div>

            <div className="table-container">
              {listLoading ? (
                <div className="loading-state">Dang tai danh sach nhan vien...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ho va Ten</th>
                      <th>SDT / Email</th>
                      <th>Vai tro</th>
                      <th>Hub / Spoke</th>
                      <th>Trang thai</th>
                      <th className="text-right">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr key={emp.id_employee}>
                        <td>
                          <span className="badge-id">EMP-{emp.id_employee}</span>
                        </td>
                        <td>
                          <div className="font-medium">{emp.full_name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                            {emp.gender} · {emp.citizen_id}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>{emp.phone}</div>
                          <div style={{ color: '#6b7280' }}>{emp.email}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(emp.roles || []).map((role: string) => (
                              <span
                                key={role}
                                style={{
                                  backgroundColor: roleColors[role] || '#6b7280',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {emp.hub_name && <span style={{ color: '#7c3aed' }}>Hub {emp.hub_name}</span>}
                          {emp.spoke_name && <span style={{ color: '#0891b2' }}>Spoke {emp.spoke_name}</span>}
                          {!emp.hub_name && !emp.spoke_name && <span style={{ color: '#9ca3af' }}>Chua phan cong</span>}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: emp.is_active ? '#d1fae5' : '#fee2e2',
                              color: emp.is_active ? '#047857' : '#b91c1c',
                            }}
                          >
                            {emp.is_active ? 'Hoat dong' : 'Da khoa'}
                          </span>
                        </td>
                        <td className="text-right">
                          {emp.is_active && (
                            <button
                              className="action-btn"
                              style={{ color: '#ef4444' }}
                              title="Khoa tai khoan"
                              onClick={() => handleDeactivate(emp.id_user, emp.full_name)}
                            >
                              <FiUserX />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Khong tim thay nhan vien nao.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'create' && (
          <div style={{ maxWidth: '800px', padding: '16px 0' }}>
            {message && (
              <div
                style={{
                  padding: '12px',
                  marginBottom: '20px',
                  borderRadius: '4px',
                  backgroundColor: message.type === 'success' ? '#dcfce3' : '#fee2e2',
                  color: message.type === 'success' ? '#166534' : '#b91c1c',
                }}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Ho va Ten', name: 'full_name', type: 'text', required: true },
                { label: 'SDT', name: 'phone', type: 'text', required: true },
                { label: 'Mat khau', name: 'password', type: 'password', required: true },
                { label: 'Email', name: 'email', type: 'email', required: true },
                { label: 'CCCD', name: 'citizen_id', type: 'text', required: true },
                { label: 'Ngay sinh', name: 'dob', type: 'date', required: false },
              ].map((field) => (
                <div key={field.name} className="form-group">
                  <label>{field.label}</label>
                  <div className="input-wrapper">
                    <input
                      type={field.type}
                      name={field.name}
                      required={field.required}
                      value={(formData as any)[field.name]}
                      onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
                    />
                  </div>
                </div>
              ))}

              <div className="form-group">
                <label>Gioi tinh</label>
                <div className="input-wrapper">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  >
                    <option>Nam</option>
                    <option>Nu</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Role</label>
                <div className="input-wrapper">
                  <select
                    name="id_role"
                    value={formData.id_role}
                    onChange={(e) => setFormData({ ...formData, id_role: parseInt(e.target.value, 10), id_hub: '', id_spoke: '' })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  >
                    {roles.map((role) => (
                      <option key={role.id_role} value={role.id_role}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Thuộc Hub (Cho NV Hub)</label>
                <div className="input-wrapper">
                  <select name="id_hub" value={formData.id_hub} disabled={isHubDisabled} onChange={(e) => setFormData({ ...formData, id_hub: e.target.value, id_spoke: e.target.value ? '' : formData.id_spoke })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: isHubDisabled ? '#f3f4f6' : 'white' }}>
                    <option value="">-- Không trực thuộc Hub --</option>
                    {hubs.map((h) => <option key={h.id_hub} value={h.id_hub}>{h.hub_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Thuộc Spoke (Cho NV Spoke / Shipper)</label>
                <div className="input-wrapper">
                  <select name="id_spoke" value={formData.id_spoke} disabled={isSpokeDisabled} onChange={(e) => setFormData({ ...formData, id_spoke: e.target.value, id_hub: e.target.value ? '' : formData.id_hub })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: isSpokeDisabled ? '#f3f4f6' : 'white' }}>
                    <option value="">-- Không trực thuộc Spoke --</option>
                    {spokes.map((s) => <option key={s.id_spoke} value={s.id_spoke}>{s.spoke_name} ({s.hub_name})</option>)}
                  </select>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }} className="form-group">
                <label>Dia chi nha</label>
                <div className="input-wrapper">
                  <input type="text" name="home_address" value={formData.home_address} onChange={(e) => setFormData({ ...formData, home_address: e.target.value })} />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={formLoading}>
                  {formLoading ? 'Dang tao tai khoan...' : 'Luu ho so nhan su'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'zones' && (
          <div style={{ padding: '16px 0', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', background: '#fff' }}>
              <h3 style={{ marginTop: 0 }}>Tao phan khu moi</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Phan cong shipper theo phuong/xa trong khu vuc ma spoke dang phu trach.
              </p>
              <form onSubmit={handleZoneSubmit} style={{ display: 'grid', gap: '14px' }}>
                <div className="form-group">
                  <label>Spoke</label>
                  <select className="form-control" required value={zoneForm.id_spoke} onChange={(e) => setZoneForm({ ...zoneForm, id_spoke: e.target.value })}>
                    <option value="">-- Chon spoke --</option>
                    {spokes.map((spoke) => (
                      <option key={spoke.id_spoke} value={spoke.id_spoke}>
                        {spoke.spoke_name} ({spoke.hub_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Shipper</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Tim shipper theo ten, SDT, email..."
                    value={shipperSearchText}
                    onChange={(e) => setShipperSearchText(e.target.value)}
                    disabled={!zoneForm.id_spoke}
                    style={{ marginBottom: '8px' }}
                  />
                  <select
                    className="form-control"
                    required
                    value={zoneForm.id_shipper}
                    onChange={(e) => setZoneForm({ ...zoneForm, id_shipper: e.target.value })}
                    disabled={!zoneForm.id_spoke}
                  >
                    <option value="">-- Chon shipper trong spoke --</option>
                    {visibleShipperOptions.map((shipper) => (
                      <option key={shipper.id_user} value={shipper.id_user}>
                        {shipper.full_name} - {shipper.phone}
                      </option>
                    ))}
                  </select>
                  {zoneForm.id_spoke && visibleShipperOptions.length === 0 && (
                    <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '6px' }}>
                      Khong tim thay shipper nao dang duoc gan vao spoke nay.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Tinh / Thanh pho</label>
                  {provinceOptions.length <= 1 ? (
                    <input
                      className="form-control"
                      value={effectiveProvince}
                      disabled
                      placeholder="Tu dong theo spoke"
                    />
                  ) : (
                    <select
                      className="form-control"
                      required
                      value={zoneForm.province}
                      onChange={(e) => setZoneForm({ ...zoneForm, province: e.target.value, district: '', ward: '' })}
                      disabled={!zoneForm.id_spoke}
                    >
                      <option value="">-- Chon tinh/thanh pho trong spoke --</option>
                      {provinceOptions.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  )}
                  {zoneForm.id_spoke && provinceOptions.length === 0 && (
                    <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '6px' }}>
                      Spoke nay chua duoc cau hinh coverage o phan Ha Tang Mang Luoi.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Quan / Huyen</label>
                  {districtOptionsBySpoke.length <= 1 ? (
                    <input
                      className="form-control"
                      value={effectiveDistrict}
                      disabled
                      placeholder="Tu dong theo spoke"
                    />
                  ) : (
                    <select
                      className="form-control"
                      required
                      value={zoneForm.district}
                      onChange={(e) => setZoneForm({ ...zoneForm, district: e.target.value, ward: '' })}
                      disabled={!effectiveProvince}
                    >
                      <option value="">-- Chon quan/huyen trong spoke --</option>
                      {districtOptions.map((district) => (
                        <option key={district.code} value={district.name}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Phuong / Xa</label>
                  <input
                    className="form-control"
                    value={zoneForm.ward}
                    onChange={(e) => setZoneForm({ ...zoneForm, ward: e.target.value })}
                    disabled={!effectiveDistrict}
                    placeholder={
                      wardOptions.length > 0
                        ? 'Go ten phuong/xa de loc danh sach ben duoi'
                        : '-- De trong neu ap dung ca quan/huyen --'
                    }
                  />
                  {visibleWardOptions.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                      }}
                    >
                      {visibleWardOptions.slice(0, 12).map((ward) => (
                        <button
                          key={ward.code}
                          type="button"
                          onClick={() => setZoneForm({ ...zoneForm, ward: ward.name })}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: zoneForm.ward === ward.name ? '#fff7ed' : '#fff',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          {ward.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {effectiveDistrict && wardOptions.length === 0 && (
                    <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '6px' }}>
                      Chua tai duoc danh sach phuong/xa. Ban van co the de trong de ap dung ca quan/huyen.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Do uu tien</label>
                  <input className="form-control" type="number" min="1" value={zoneForm.priority} onChange={(e) => setZoneForm({ ...zoneForm, priority: e.target.value })} />
                </div>

                <button type="submit" className="btn-primary" disabled={zoneLoading}>
                  {zoneLoading ? 'Dang luu...' : 'Luu phan khu'}
                </button>
              </form>
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Shipper</th>
                    <th>Spoke</th>
                    <th>Khu vuc</th>
                    <th>Priority</th>
                    <th className="text-right">Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {wardAssignments.map((item) => (
                    <tr key={item.id_assignment}>
                      <td><span className="badge-id">ZONE-{item.id_assignment}</span></td>
                      <td>
                        <div className="font-medium">{item.shipper_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.shipper_phone}</div>
                      </td>
                      <td>{item.spoke_name}</td>
                      <td>
                        {item.ward ? `${item.ward}, ${item.district}, ${item.province}` : `${item.district}, ${item.province}`}
                      </td>
                      <td>{item.priority}</td>
                      <td className="text-right">
                        <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleDeleteZone(item.id_assignment)}>
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {wardAssignments.length === 0 && <tr><td colSpan={6} className="empty-state">Chua co phan khu shipper nao.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Quan tri quyen">
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', color: '#4b5563', fontSize: '0.9rem', marginBottom: '20px' }}>
          Gan hoac thu hoi role cho user theo id_user.
        </div>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>ID User</label>
            <input type="number" required className="form-control" value={roleForm.id_user} onChange={(e) => setRoleForm({ ...roleForm, id_user: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Role</label>
            <select required className="form-control" value={roleForm.id_role} onChange={(e) => setRoleForm({ ...roleForm, id_role: e.target.value })}>
              <option value="">-- Chon role --</option>
              {roles.map((role) => (
                <option key={role.id_role} value={role.id_role}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary flex-center gap-2" style={{ flex: 1 }} onClick={grantRole}>
              <FiShield /> Cap Quyen
            </button>
            <button
              className="btn-primary flex-center gap-2"
              style={{ flex: 1, backgroundColor: '#fee2e2', color: '#b91c1c' }}
              onClick={revokeRole}
            >
              <FiTrash2 /> Tuoc Quyen
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default Employees;
