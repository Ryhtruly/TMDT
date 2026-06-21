import { useEffect, useState } from 'react';
import {
  FiClock,
  FiPackage,
  FiSend,
  FiTruck,
  FiMapPin,
  FiArrowRightCircle,
  FiDownload,
  FiSearch,
} from 'react-icons/fi';
import api from '../../api/client';
import './Transit.css';

type TransitItem = {
  id_order: number;
  tracking_code: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  status: string;
  district?: string;
  province?: string;
  departed_at: string;
  transit_hours: string;
  direction: 'OUTBOUND' | 'INBOUND';
  from_location_name: string;
  from_location_type?: string;
  to_location_name: string;
  to_location_type?: string;
};

const normalizeText = (value?: string | null) => String(value || '').trim();

const TransitCard = ({ item }: { item: TransitItem }) => {
  const isOutbound = item.direction === 'OUTBOUND';
  const destinationText = item.province ? `${item.district || ''}, ${item.province}` : 'Dang trung chuyen';

  return (
    <div className={`transit-card ${isOutbound ? 'outbound' : 'incoming'}`}>
      <div className="transit-card-header">
        <div className="transit-code">
          <FiPackage size={16} />
          {item.tracking_code}
        </div>
        <div className="transit-hours">
          <FiClock size={12} />
          {item.transit_hours}h
        </div>
      </div>

      <div className="transit-direction">
        <div className="transit-stop">
          <span className="transit-stop-label">Tu</span>
          <strong>{item.from_location_name}</strong>
        </div>
        <FiArrowRightCircle className="transit-arrow" size={18} />
        <div className="transit-stop">
          <span className="transit-stop-label">Den</span>
          <strong>{item.to_location_name}</strong>
        </div>
      </div>

      <div className="transit-row">
        <span className="transit-label">Loai luong:</span>
        <span className={`transit-badge ${isOutbound ? 'outbound' : 'incoming'}`}>
          {isOutbound ? 'Da roi kho nay' : 'Sap toi kho nay'}
        </span>
      </div>
      <div className="transit-row">
        <span className="transit-label">Chuyen tiep:</span>
        <span className="transit-value">
          <FiTruck size={12} />
          {destinationText}
        </span>
      </div>
      <div className="transit-row">
        <span className="transit-label">Xuat phat luc:</span>
        <span className="transit-value">{new Date(item.departed_at).toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );
};

const Transit = () => {
  const [loading, setLoading] = useState(true);
  const [warehouseTitle, setWarehouseTitle] = useState('');
  const [outgoing, setOutgoing] = useState<TransitItem[]>([]);
  const [incoming, setIncoming] = useState<TransitItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  useEffect(() => {
    const fetchTransit = async () => {
      try {
        setLoading(true);
        const res: any = await api.get('/stockkeeper/transit').catch(() => null);
        const data = res?.data || {};
        setWarehouseTitle(data.warehouse || 'Kho hien tai');
        setOutgoing(data.outgoing || []);
        setIncoming(data.incoming || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransit();
  }, []);

  const allItems = [...outgoing, ...incoming];
  const fromOptions = Array.from(new Set(allItems.map((item) => normalizeText(item.from_location_name)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'));
  const toOptions = Array.from(new Set(allItems.map((item) => normalizeText(item.to_location_name)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'));

  const matchesTransitFilters = (item: TransitItem) => {
    const matchesTracking = !searchTerm || normalizeText(item.tracking_code).toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesFrom = !fromFilter || normalizeText(item.from_location_name) === fromFilter;
    const matchesTo = !toFilter || normalizeText(item.to_location_name) === toFilter;
    return matchesTracking && matchesFrom && matchesTo;
  };

  const filteredOutgoing = outgoing.filter(matchesTransitFilters);
  const filteredIncoming = incoming.filter(matchesTransitFilters);

  return (
    <div className="transit-page">
      <div className="transit-hero">
        <div>
          <h1>Don dang trung chuyen</h1>
          <div className="transit-subtitle">
            <FiMapPin size={14} />
            {warehouseTitle}
          </div>
        </div>
        <div className="transit-summary">
          <div className="transit-summary-card">
            <FiSend size={18} />
            <div>
              <strong>{outgoing.length}</strong>
              <span>Da gui di</span>
            </div>
          </div>
          <div className="transit-summary-card incoming">
            <FiDownload size={18} />
            <div>
              <strong>{incoming.length}</strong>
              <span>Sap toi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="transit-filter-bar">
        <div className="transit-search-box">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Tim theo ma van don..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="transit-filter-select" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)}>
          <option value="">Tat ca diem truoc do</option>
          {fromOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="transit-filter-select" value={toFilter} onChange={(e) => setToFilter(e.target.value)}>
          <option value="">Tat ca diem dich</option>
          {toOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="transit-empty">Dang tai du lieu trung chuyen...</div>
      ) : (
        <>
          <section className="transit-section">
            <div className="transit-section-title">Da roi {warehouseTitle} ({filteredOutgoing.length})</div>
            {filteredOutgoing.length === 0 ? (
              <div className="transit-empty">Khong co don nao phu hop voi bo loc hien tai.</div>
            ) : (
              <div className="transit-grid">
                {filteredOutgoing.map((item) => <TransitCard key={`out-${item.id_order}`} item={item} />)}
              </div>
            )}
          </section>

          <section className="transit-section">
            <div className="transit-section-title">Sap toi {warehouseTitle} ({filteredIncoming.length})</div>
            {filteredIncoming.length === 0 ? (
              <div className="transit-empty">Khong co don nao phu hop voi bo loc hien tai.</div>
            ) : (
              <div className="transit-grid">
                {filteredIncoming.map((item) => <TransitCard key={`in-${item.id_order}`} item={item} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Transit;
