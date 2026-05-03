import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { MENUS } from './data/mockData';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SaisiePage from './pages/SaisiePage';
import EdtPage from './pages/EdtPage';
import HistoriquePage from './pages/HistoriquePage';
import RessourcesPage from './pages/RessourcesPage';
import NotificationsPage from './pages/NotificationsPage';

import ConseillerPage from './pages/ConseillerPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import ProgressionPage from './pages/ProgressionPage';
import SuiviCollectifPage from './pages/SuiviCollectifPage';

function RoleRedirect() {
  const { user } = useAuth();
  const menu = MENUS[user?.role] || MENUS['enseignant'];
  const firstPath = menu[0]?.path || '/dashboard';
  return <Navigate to={firstPath} replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--cream)',
        fontFamily: "'Syne', sans-serif", color: 'var(--navy)', fontSize: '16px', gap: '12px'
      }}>
        <div style={{
          width: '24px', height: '24px', border: '3px solid var(--navy)',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
           <Route index element={<RoleRedirect />} />
           
           <Route path="dashboard" element={<DashboardPage />} />
           <Route path="saisie" element={<SaisiePage />} />
           <Route path="edt" element={<EdtPage />} />
           <Route path="historique" element={<HistoriquePage />} />
           <Route path="ressources" element={<RessourcesPage />} />
           <Route path="notifications" element={<NotificationsPage />} />

           <Route path="progression" element={<ProgressionPage />} />
           <Route path="suivi" element={<SuiviCollectifPage />} />
           <Route path="conseiller" element={<ConseillerPage />} />
           <Route path="admin" element={<AdminPage />} />
           <Route path="profil" element={<ProfilePage />} />
           
           <Route path="*" element={<RoleRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

