import { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiEdit2, FiServer, FiMapPin, FiMap, FiTrash2,
  FiX, FiCheck, FiAlertCircle, FiLink, FiMinusCircle, FiInfo, FiSave
} from 'react-icons/fi';
import apiClient from '../api/client';
import './Infrastructure.css';

// ==================== TYPES ====================
interface Hub { id_hub: number; hub_name: string; description: string; }
interface Spoke {
  id_spoke: number; spoke_name: string; hub_name?: string; id_hub?: number | null;
  areas?: { id_area: number; district: string; province: string; area_type: string }[];
}
interface Area {
  id_area: number; district: string; province: string; area_type: string;
  id_spoke?: number | null; spoke_name?: string;
}
type ModalType = 'ADD_HUB' | 'EDIT_HUB' | 'ADD_SPOKE' | 'EDIT_SPOKE' | 'ADD_AREA' | null;

// ==================== MODAL ====================
const Modal = ({ isOpen, onClose, title, children, maxWidth = '580px' }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', animation: 'modalIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><FiX size={15} /></button>
        </div>
        <div style={{ padding: '22px 26px' }}>{children}</div>
      </div>
    </div>
  );
};

// ==================== FORM HELPERS ====================
const FF = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>{hint}</p>}
  </div>
);
const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ padding: '9px 13px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', color: '#1e293b', ...p.style }}
    onFocus={e => (e.target.style.borderColor = '#F26522')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
);
const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} style={{ padding: '9px 13px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#1e293b', cursor: 'pointer', ...p.style }} />
);
const Txta = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} style={{ padding: '9px 13px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: '#1e293b', minHeight: '72px', ...p.style }} />
);
const SaveBtn = ({ loading, label }: { loading: boolean; label: string }) => (
  <button type="submit" disabled={loading} style={{ padding: '11px', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#F26522,#e5501a)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.92rem', cursor: loading ? 'not-allowed' : 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
    {loading ? 'Dang luu...' : <><FiSave size={15} />{label}</>}
  </button>
);
const OrphanTag = () => (
  <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 9px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
    <FiAlertCircle size={10} /> Mo coi
  </span>
);

// ==================== MAIN ====================
const Infrastructure = () => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [spokes, setSpokes] = useState<Spoke[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hubs' | 'spokes' | 'areas'>('hubs');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // --- Staged changes (only committed on "Luu thay doi") ---
  // For EDIT_HUB: which spokes are currently shown (local copy)
  const [localSpokes, setLocalSpokes] = useState<Spoke[]>([]);
  // toAdd/toRemove: spoke IDs staged for assign/unassign
  const [spokesToAdd, setSpokesToAdd] = useState<number[]>([]);
  const [spokesToRemove, setSpokesToRemove] = useState<number[]>([]);

  // For EDIT_SPOKE: which areas are currently shown (local copy)
  const [localAreas, setLocalAreas] = useState<Area[]>([]);
  const [areasToAdd, setAreasToAdd] = useState<number[]>([]);
  const [areasToRemove, setAreasToRemove] = useState<number[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/infrastructure');
      if (res.data) {
        setHubs(res.data.hubs || []);
        setSpokes(res.data.spokes || []);
        setAreas(res.data.areas || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (type: ModalType, item?: any) => {
    setModalType(type);
    setEditingItem(item || null);
    setForm(
      type === 'EDIT_HUB' ? { name: item?.hub_name || '', description: item?.description || '' } :
      type === 'EDIT_SPOKE' ? { name: item?.spoke_name || '' } : {}
    );
    // Reset staged changes and local copies
    setSpokesToAdd([]); setSpokesToRemove([]);
    setAreasToAdd([]); setAreasToRemove([]);
    if (type === 'EDIT_HUB' && item) {
      setLocalSpokes(spokes.filter(s => s.id_hub === item.id_hub));
    }
    if (type === 'EDIT_SPOKE' && item) {
      setLocalAreas(areas.filter(a => a.id_spoke === item.id_spoke));
    }
  };

  const closeModal = () => { setModalType(null); setEditingItem(null); setForm({}); setLocalSpokes([]); setLocalAreas([]); setSpokesToAdd([]); setSpokesToRemove([]); setAreasToAdd([]); setAreasToRemove([]); };

  // --- Staged: stage spoke removal (visual only) ---
  const stageRemoveSpoke = (spoke: Spoke) => {
    setLocalSpokes(ls => ls.filter(s => s.id_spoke !== spoke.id_spoke));
    if (spokesToAdd.includes(spoke.id_spoke)) {
      setSpokesToAdd(a => a.filter(id => id !== spoke.id_spoke));
    } else {
      setSpokesToRemove(r => [...r, spoke.id_spoke]);
    }
  };

  // --- Staged: stage spoke addition (visual only) ---
  const stageAddSpoke = (id_spoke: number) => {
    const spoke = spokes.find(s => s.id_spoke === id_spoke);
    if (!spoke) return;
    setLocalSpokes(ls => [...ls, spoke]);
    if (spokesToRemove.includes(id_spoke)) {
      setSpokesToRemove(r => r.filter(id => id !== id_spoke));
    } else {
      setSpokesToAdd(a => [...a, id_spoke]);
    }
  };

  // --- Staged: stage area removal (visual only) ---
  const stageRemoveArea = (area: Area) => {
    setLocalAreas(la => la.filter(a => a.id_area !== area.id_area));
    if (areasToAdd.includes(area.id_area)) {
      setAreasToAdd(a => a.filter(id => id !== area.id_area));
    } else {
      setAreasToRemove(r => [...r, area.id_area]);
    }
  };

  // --- Staged: stage area addition (visual only) ---
  const stageAddArea = (id_area: number) => {
    const area = areas.find(a => a.id_area === id_area);
    if (!area) return;
    setLocalAreas(la => [...la, area]);
    if (areasToRemove.includes(id_area)) {
      setAreasToRemove(r => r.filter(id => id !== id_area));
    } else {
      setAreasToAdd(a => [...a, id_area]);
    }
  };

  // ==================== SUBMIT (commits everything) ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (modalType === 'ADD_HUB') {
        await apiClient.post('/admin/hubs', { location_name: form.name, description: form.description, address: form.address, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) });
      } else if (modalType === 'EDIT_HUB' && editingItem) {
        // 1. Save name/description
        await apiClient.put(`/admin/hubs/${editingItem.id_hub}`, { hub_name: form.name, description: form.description });
        // 2. Commit staged spoke removals
        for (const id of spokesToRemove) {
          await apiClient.delete(`/admin/hubs/${editingItem.id_hub}/spokes/${id}`);
        }
        // 3. Commit staged spoke additions
        for (const id of spokesToAdd) {
          await apiClient.put(`/admin/hubs/${editingItem.id_hub}/spokes/${id}`);
        }
      } else if (modalType === 'ADD_SPOKE') {
        await apiClient.post('/admin/spokes', { spoke_name: form.name, location_name: form.name, address: form.address, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), id_hub: form.id_hub ? parseInt(form.id_hub) : undefined });
      } else if (modalType === 'EDIT_SPOKE' && editingItem) {
        // 1. Save name
        await apiClient.put(`/admin/spokes/${editingItem.id_spoke}`, { spoke_name: form.name });
        // 2. Commit staged area removals
        for (const id of areasToRemove) {
          await apiClient.delete(`/admin/spokes/${editingItem.id_spoke}/areas/${id}`);
        }
        // 3. Commit staged area additions (server validates province)
        const failedAreas: string[] = [];
        for (const id of areasToAdd) {
          try {
            await apiClient.put(`/admin/spokes/${editingItem.id_spoke}/areas/${id}`);
          } catch (err: any) {
            const a = areas.find(x => x.id_area === id);
            failedAreas.push(`${a?.district || id}: ${err.response?.data?.message || err.message}`);
          }
        }
        if (failedAreas.length > 0) {
          alert('Mot so khu vuc khong the gan:\n' + failedAreas.join('\n'));
        }
      } else if (modalType === 'ADD_AREA') {
        await apiClient.post('/admin/areas', { province: form.province, district: form.district, area_type: form.area_type || 'NOI THANH', id_spoke: form.id_spoke ? parseInt(form.id_spoke) : undefined });
      }
      closeModal();
      fetchAll();
    } catch (err: any) {
      alert('Loi: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number, type: 'hub' | 'spoke') => {
    const c = prompt(`Go "XOA" de xac nhan giai the ${type.toUpperCase()}-${id}:`);
    if (c !== 'XOA') return;
    try {
      if (type === 'hub') await apiClient.delete(`/admin/hubs/${id}`);
      else await apiClient.delete(`/admin/spokes/${id}`);
      fetchAll();
    } catch (err: any) { alert(err.response?.data?.message || err.message); }
  };

  // Available orphan spokes (not in localSpokes yet)
  const availableOrphanSpokes = spokes.filter(s => !s.id_hub && !localSpokes.some(ls => ls.id_spoke === s.id_spoke));
  // Available orphan areas (not in localAreas yet)
  const availableOrphanAreas = areas.filter(a => !a.id_spoke && !localAreas.some(la => la.id_area === a.id_area));

  const orphanSpokes = spokes.filter(s => !s.id_hub);
  const orphanAreas = areas.filter(a => !a.id_spoke);

  const hasPendingChanges = spokesToAdd.length + spokesToRemove.length + areasToAdd.length + areasToRemove.length > 0;

  // ==================== MODAL CONTENT ====================
  const renderModalContent = () => {
    if (modalType === 'ADD_HUB' || modalType === 'EDIT_HUB') {
      const isEdit = modalType === 'EDIT_HUB';
      return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <FF label="Ten Hub / Kho Trung Tam">
            <Inp required placeholder="VD: Hub Mien Nam" value={form.name || ''} onChange={e => setF('name', e.target.value)} />
          </FF>
          <FF label="Mo ta">
            <Txta placeholder="Vi tri, vai tro..." value={form.description || ''} onChange={e => setF('description', e.target.value)} />
          </FF>
          {!isEdit && (<>
            <FF label="Dia chi day du">
              <Inp required placeholder="VD: KCN Tan Phu Trung, Cu Chi, TP.HCM" value={form.address || ''} onChange={e => setF('address', e.target.value)} />
            </FF>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FF label="Vi do (Latitude)"><Inp type="number" step="0.000001" required placeholder="10.9255" value={form.latitude || ''} onChange={e => setF('latitude', e.target.value)} /></FF>
              <FF label="Kinh do (Longitude)"><Inp type="number" step="0.000001" required placeholder="106.5361" value={form.longitude || ''} onChange={e => setF('longitude', e.target.value)} /></FF>
            </div>
          </>)}

          {isEdit && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Buu Cuc Truc Thuoc</h3>
                {hasPendingChanges && (
                  <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    {spokesToAdd.length + spokesToRemove.length} thay doi chua luu
                  </span>
                )}
              </div>

              {/* Current spokes (local/staged) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
                {localSpokes.length === 0
                  ? <div style={{ padding: '10px', background: '#fafafa', borderRadius: '8px', color: '#94a3b8', fontSize: '0.83rem', textAlign: 'center' }}>Chua co buu cuc nao truc thuoc</div>
                  : localSpokes.map(s => {
                    const isPending = spokesToAdd.includes(s.id_spoke);
                    return (
                      <div key={s.id_spoke} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isPending ? '#f0fdf4' : '#f8fafc', padding: '9px 13px', borderRadius: '9px', border: `1px solid ${isPending ? '#bbf7d0' : '#e2e8f0'}` }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{s.spoke_name}</span>
                          <span style={{ marginLeft: '7px', fontSize: '0.75rem', color: '#94a3b8' }}>SPK-{s.id_spoke}</span>
                          {isPending && <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>+ Moi them</span>}
                        </div>
                        <button type="button" onClick={() => stageRemoveSpoke(s)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                          <FiMinusCircle size={11} /> Gỡ
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Add orphan spoke dropdown */}
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Them Spoke Mo Coi</h4>
              {availableOrphanSpokes.length === 0
                ? <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '7px', color: '#16a34a', fontSize: '0.82rem' }}>Khong con spoke mo coi nao</div>
                : <>
                  <Sel onChange={e => { if (e.target.value) { stageAddSpoke(Number(e.target.value)); e.target.value = ''; } }} defaultValue="">
                    <option value="">-- Chon Spoke Mo Coi De Them --</option>
                    {availableOrphanSpokes.map(s => <option key={s.id_spoke} value={s.id_spoke}>{s.spoke_name}</option>)}
                  </Sel>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiInfo size={10} /> Server kiem tra khoang cach (&lt;150km). Luu thay doi de ap dung.
                  </p>
                </>
              }
            </div>
          )}

          <SaveBtn loading={formLoading} label={isEdit ? 'Luu Thay Doi' : 'Khoi Tao Hub Moi'} />
        </form>
      );
    }

    if (modalType === 'ADD_SPOKE' || modalType === 'EDIT_SPOKE') {
      const isEdit = modalType === 'EDIT_SPOKE';
      return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <FF label="Ten Buu Cuc (Spoke)">
            <Inp required placeholder="VD: Buu cuc Quan 1" value={form.name || ''} onChange={e => setF('name', e.target.value)} />
          </FF>
          {!isEdit && (<>
            <FF label="Dia chi day du">
              <Inp required placeholder="VD: 112 Tran Dinh Xu, Q1, TP.HCM" value={form.address || ''} onChange={e => setF('address', e.target.value)} />
            </FF>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FF label="Vi do (Latitude)"><Inp type="number" step="0.000001" required placeholder="10.7769" value={form.latitude || ''} onChange={e => setF('latitude', e.target.value)} /></FF>
              <FF label="Kinh do (Longitude)"><Inp type="number" step="0.000001" required placeholder="106.7009" value={form.longitude || ''} onChange={e => setF('longitude', e.target.value)} /></FF>
            </div>
            <FF label="Thuoc Hub (tuy chon)" hint="De trong neu muon de mo coi, phan bo sau.">
              <Sel value={form.id_hub || ''} onChange={e => setF('id_hub', e.target.value)}>
                <option value="">-- Mo coi (Phan bo sau) --</option>
                {hubs.map(h => <option key={h.id_hub} value={h.id_hub}>{h.hub_name}</option>)}
              </Sel>
            </FF>
          </>)}

          {isEdit && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Khu Vuc Phu Trach</h3>
                {hasPendingChanges && (
                  <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    {areasToAdd.length + areasToRemove.length} thay doi chua luu
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
                {localAreas.length === 0
                  ? <div style={{ padding: '10px', background: '#fafafa', borderRadius: '8px', color: '#94a3b8', fontSize: '0.83rem', textAlign: 'center' }}>Chua co khu vuc nao</div>
                  : localAreas.map(a => {
                    const isPending = areasToAdd.includes(a.id_area);
                    return (
                      <div key={a.id_area} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isPending ? '#f0fdf4' : '#f8fafc', padding: '9px 13px', borderRadius: '9px', border: `1px solid ${isPending ? '#bbf7d0' : '#e2e8f0'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{a.district}</span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({a.province})</span>
                          <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>{a.area_type}</span>
                          {isPending && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>+ Moi them</span>}
                        </div>
                        <button type="button" onClick={() => stageRemoveArea(a)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <FiMinusCircle size={11} /> Go
                        </button>
                      </div>
                    );
                  })}
              </div>

              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', margin: '0 0 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Them Khu Vuc Mo Coi</h4>
              {availableOrphanAreas.length === 0
                ? <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '7px', color: '#16a34a', fontSize: '0.82rem' }}>Khong con khu vuc mo coi nao</div>
                : <Sel onChange={e => { if (e.target.value) { stageAddArea(Number(e.target.value)); e.target.value = ''; } }} defaultValue="">
                  <option value="">-- Chon Quan/Huyen mo coi --</option>
                  {availableOrphanAreas.map(a => <option key={a.id_area} value={a.id_area}>{a.district} - {a.province} ({a.area_type})</option>)}
                </Sel>
              }
            </div>
          )}

          <SaveBtn loading={formLoading} label={isEdit ? 'Luu Thay Doi' : 'Mo Buu Cuc Moi'} />
        </form>
      );
    }

    if (modalType === 'ADD_AREA') {
      return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '9px', padding: '11px 13px', fontSize: '0.83rem', color: '#9a3412' }}>
            Khu vuc moi tao co the gan ngay vao Buu cuc, hoac de tu do (mo coi) roi phan bo sau.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FF label="Tinh / Thanh Pho"><Inp required placeholder="Ho Chi Minh" value={form.province || ''} onChange={e => setF('province', e.target.value)} /></FF>
            <FF label="Quan / Huyen"><Inp required placeholder="Quan 1" value={form.district || ''} onChange={e => setF('district', e.target.value)} /></FF>
          </div>
          <FF label="Loai Tuyen Phi">
            <Sel value={form.area_type || 'NOI THANH'} onChange={e => setF('area_type', e.target.value)}>
              <option value="NOI THANH">NOI THANH</option>
              <option value="NGOAI THANH">NGOAI THANH</option>
            </Sel>
          </FF>
          <FF label="Gan vao Buu Cuc (tuy chon)" hint="De trong neu muon tao khu vuc mo coi.">
            <Sel value={form.id_spoke || ''} onChange={e => setF('id_spoke', e.target.value)}>
              <option value="">-- Tao mo coi (Gan sau) --</option>
              {spokes.map(s => <option key={s.id_spoke} value={s.id_spoke}>{s.spoke_name}{s.id_hub ? ` (${s.hub_name})` : ' [Mo coi]'}</option>)}
            </Sel>
          </FF>
          <SaveBtn loading={formLoading} label="Tao Phan Vung" />
        </form>
      );
    }
    return null;
  };

  const addAction = activeTab === 'hubs' ? { label: '+ Them Hub', modal: 'ADD_HUB' as ModalType }
    : activeTab === 'spokes' ? { label: '+ Them Spoke', modal: 'ADD_SPOKE' as ModalType }
    : { label: '+ Them Phan Vung', modal: 'ADD_AREA' as ModalType };

  const modalTitle =
    modalType === 'ADD_HUB' ? 'Khoi tao Hub moi' :
    modalType === 'EDIT_HUB' ? `Chinh sua Hub: ${editingItem?.hub_name}` :
    modalType === 'ADD_SPOKE' ? 'Mo Buu Cuc Moi' :
    modalType === 'EDIT_SPOKE' ? `Chinh sua Buu cuc: ${editingItem?.spoke_name}` :
    'Them Phan Vung Moi';

  const areaStyle = (t: string) => ({
    background: t.includes('NOI') || t.includes('NỘI') ? '#dbeafe' : '#fef9c3',
    color: t.includes('NOI') || t.includes('NỘI') ? '#1d4ed8' : '#854d0e',
    padding: '2px 8px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 600 as const,
  });

  return (
    <div className="infrastructure-page">
      <div className="page-header d-flex justify-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quan Ly Ha Tang Mang Luoi</h1>
          <p className="page-subtitle">Sap xep Kho Trung Tam (Hub), Buu Cuc (Spoke) va Phan Vung (Areas)</p>
        </div>
        <button className="btn-primary flex-center gap-2" onClick={() => openModal(addAction.modal)} style={{ whiteSpace: 'nowrap', marginTop: '4px' }}>
          <FiPlus /> {addAction.label}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { icon: <FiServer size={20} />, label: 'Kho Hub', value: hubs.length, color: '#F26522', bg: '#fff7ed' },
          { icon: <FiMapPin size={20} />, label: 'Buu cuc Spoke', value: spokes.length, sub: orphanSpokes.length > 0 ? `${orphanSpokes.length} mo coi` : undefined, color: '#7c3aed', bg: '#f5f3ff' },
          { icon: <FiMap size={20} />, label: 'Phan Vung', value: areas.length, sub: orphanAreas.length > 0 ? `${orphanAreas.length} mo coi` : undefined, color: '#0ea5e9', bg: '#f0f9ff' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', border: `1px solid ${c.color}22` }}>
            <div style={{ color: c.color, background: `${c.color}18`, borderRadius: '10px', padding: '9px', display: 'flex' }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{c.label}</div>
              {c.sub && <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'hubs' ? 'active' : ''}`} onClick={() => setActiveTab('hubs')}><FiServer className="tab-icon" /> Kho Hub ({hubs.length})</button>
          <button className={`tab-btn ${activeTab === 'spokes' ? 'active' : ''}`} onClick={() => setActiveTab('spokes')}>
            <FiMapPin className="tab-icon" /> Buu Cuc ({spokes.length})
            {orphanSpokes.length > 0 && <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700, marginLeft: '4px' }}>{orphanSpokes.length}</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => setActiveTab('areas')}>
            <FiMap className="tab-icon" /> Phan Vung ({areas.length})
            {orphanAreas.length > 0 && <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700, marginLeft: '4px' }}>{orphanAreas.length}</span>}
          </button>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Dang tai du lieu ha tang...</div>
          : activeTab === 'hubs' ? (
            <table className="admin-table">
              <thead><tr>
                <th style={{ width: '8%' }}>ID</th><th style={{ width: '27%' }}>Ten Hub</th>
                <th style={{ width: '27%' }}>Mo ta</th><th style={{ width: '26%' }}>Buu cuc truc thuoc</th>
                <th style={{ width: '12%' }} className="text-right">Thao tac</th>
              </tr></thead>
              <tbody>
                {hubs.length === 0 && <tr><td colSpan={5} className="empty-state">Chua co Hub nao.</td></tr>}
                {hubs.map(hub => {
                  const own = spokes.filter(s => s.id_hub === hub.id_hub);
                  return (
                    <tr key={hub.id_hub}>
                      <td><span className="badge-id">HUB-{hub.id_hub}</span></td>
                      <td className="font-medium" style={{ color: '#0f172a' }}>{hub.hub_name}</td>
                      <td className="text-muted" style={{ fontSize: '0.84rem' }}>{hub.description || '—'}</td>
                      <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {own.length === 0 ? <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.8rem' }}>Chua co buu cuc</span>
                          : own.map(s => <span key={s.id_spoke} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '7px', fontSize: '0.76rem', fontWeight: 500 }}>{s.spoke_name}</span>)}
                      </div></td>
                      <td className="text-right">
                        <button className="action-btn text-primary" onClick={() => openModal('EDIT_HUB', hub)} style={{ marginRight: '5px' }} title="Sua & Quan ly Spoke"><FiEdit2 size={14} /></button>
                        <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(hub.id_hub, 'hub')}><FiTrash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'spokes' ? (
            <table className="admin-table">
              <thead><tr>
                <th style={{ width: '8%' }}>ID</th><th style={{ width: '22%' }}>Ten Buu Cuc</th>
                <th style={{ width: '20%' }}>Thuoc Hub</th><th style={{ width: '38%' }}>Khu Vuc Phu Trach</th>
                <th style={{ width: '12%' }} className="text-right">Thao tac</th>
              </tr></thead>
              <tbody>
                {spokes.length === 0 && <tr><td colSpan={5} className="empty-state">Chua co Spoke nao.</td></tr>}
                {spokes.map(spoke => (
                  <tr key={spoke.id_spoke}>
                    <td><span className="badge-id">SPK-{spoke.id_spoke}</span></td>
                    <td className="font-medium" style={{ color: '#0f172a' }}>{spoke.spoke_name}</td>
                    <td>{spoke.id_hub ? <span className="badge-hub">{spoke.hub_name}</span> : <OrphanTag />}</td>
                    <td>{spoke.areas && spoke.areas.length > 0
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{spoke.areas.map((a, i) => <span key={i} style={areaStyle(a.area_type)}>{a.district}</span>)}</div>
                      : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.8rem' }}>Chua phan vung</span>}
                    </td>
                    <td className="text-right">
                      <button className="action-btn text-primary" onClick={() => openModal('EDIT_SPOKE', spoke)} style={{ marginRight: '5px' }}><FiEdit2 size={14} /></button>
                      <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(spoke.id_spoke, 'spoke')}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead><tr>
                <th style={{ width: '8%' }}>ID</th><th style={{ width: '22%' }}>Tinh/Thanh</th>
                <th style={{ width: '22%' }}>Quan/Huyen</th><th style={{ width: '14%' }}>Loai</th>
                <th style={{ width: '34%' }}>Buu cuc phu trach</th>
              </tr></thead>
              <tbody>
                {areas.length === 0 && <tr><td colSpan={5} className="empty-state">Chua co phan vung nao.</td></tr>}
                {areas.map(a => (
                  <tr key={a.id_area}>
                    <td><span className="badge-id">A-{a.id_area}</span></td>
                    <td className="font-medium">{a.province}</td>
                    <td>{a.district}</td>
                    <td><span style={areaStyle(a.area_type)}>{a.area_type}</span></td>
                    <td>{a.id_spoke
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><FiLink size={12} style={{ color: '#16a34a' }} /><span style={{ fontWeight: 500 }}>{a.spoke_name || `Spoke-${a.id_spoke}`}</span></div>
                      : <OrphanTag />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={!!modalType} onClose={closeModal} title={modalTitle} maxWidth="590px">
        {renderModalContent()}
      </Modal>

      <style>{`
        @keyframes modalIn { from{opacity:0;transform:translateY(-12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .text-primary { color: var(--primary-color) !important; }
      `}</style>
    </div>
  );
};

export default Infrastructure;
