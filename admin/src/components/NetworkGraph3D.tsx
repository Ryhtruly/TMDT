import React, { useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

interface TopologyProps {
  hubs: any[];
  spokes: any[];
}

const NetworkGraph3D: React.FC<TopologyProps> = ({ hubs, spokes }) => {
  const fgRef = useRef<any>(null);
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('topology-container');
      if (container) {
        setWindowSize({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // Add central Node (Tổng Công Ty)
    nodes.push({ id: 'HQ', name: 'Trụ Sở Chính (HQ)', group: 0, val: 50, color: '#f59e0b' });

    // Add Hubs
    hubs.forEach(h => {
      nodes.push({ id: `HUB-${h.id_hub}`, name: h.hub_name, group: 1, val: 30, color: '#ef4444' });
      links.push({ source: 'HQ', target: `HUB-${h.id_hub}`, value: 2 });
    });

    // Add Spokes
    spokes.forEach(s => {
      nodes.push({ id: `SPK-${s.id_spoke}`, name: s.spoke_name, group: 2, val: 10, color: '#3b82f6' });
      links.push({ source: `HUB-${s.id_hub}`, target: `SPK-${s.id_spoke}`, value: 1 });
    });

    return { nodes, links };
  }, [hubs, spokes]);

  return (
    <div id="topology-container" style={{ width: '100%', height: 'calc(100vh - 250px)', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#020617', border: '1px solid var(--slate-200)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: '10px 15px', borderRadius: '8px', fontSize: '12px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#F26522' }}>Ghi chú Giải phẫu Hệ thống</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }}></div> Trụ Sở Chính (HQ)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Kho Tổng (Hubs)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div> Bưu Cục (Spokes)
        </div>
        <p style={{ marginTop: '10px', color: '#94a3b8', fontStyle: 'italic' }}>* Quét chuột để xoay, lăn chuột để Zoom In/Out</p>
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={windowSize.width}
        height={windowSize.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={(node: any) => node.color}
        nodeVal={(node: any) => node.val}
        nodeResolution={16}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={() => 0.005}
        linkWidth={1.5}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        enableNodeDrag={false}
        onNodeClick={(node: any) => {
          // Tự động Căn giữa 3D khi click vào Hub/Spoke
          const distance = 100;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
          if (fgRef.current) {
             fgRef.current.cameraPosition(
               { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, 
               node, 
               2000 
             );
          }
        }}
      />
    </div>
  );
};

export default NetworkGraph3D;
