import React from 'react';
import { FiX } from 'react-icons/fi';
import './Drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <>
      {/* Backdrop (màn đen trong suốt) */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />

      {/* Panel trượt từ bên phải */}
      <div className={`drawer-panel ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default Drawer;
