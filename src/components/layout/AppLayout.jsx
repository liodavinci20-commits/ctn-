import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RattrapageModal from '../modals/RattrapageModal';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const [rattrapageOpen, setRattrapageOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  if (!user) return null;

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <div id="app-shell" style={{ display: 'block', minHeight: '100vh' }}>
      <Sidebar />
      <Topbar onOpenRattrapage={() => setRattrapageOpen(true)} />
      <main className="main-content">
         <Outlet context={{ openRattrapage: () => setRattrapageOpen(true), showToast }} />
      </main>
      
      <RattrapageModal 
        isOpen={rattrapageOpen} 
        onClose={() => setRattrapageOpen(false)} 
        showToast={showToast}
      />

      {/* Global Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-message ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : '✦'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
