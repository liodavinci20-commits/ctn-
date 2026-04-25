import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGE_TITLES } from '../../data/mockData';

export default function Topbar({ onOpenRattrapage }) {
  const { user } = useAuth();
  const { unreadCountFor } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const pageKey = location.pathname.split('/')[1] || 'dashboard';
  const titles = PAGE_TITLES[pageKey] || ['CTN', ''];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>{titles[0]}</h2>
        <p>{titles[1]}</p>
      </div>
      <div className="topbar-actions">
        <div className="tb-notif" onClick={() => navigate('/notifications')}>
          ◉
          {unreadCountFor(user.id) > 0 && <div className="tb-notif-dot"></div>}
        </div>

        {user.role === 'enseignant' && (
          <button className="tb-btn tb-btn-outline" onClick={onOpenRattrapage}>⚑ Rattrapages</button>
        )}

        <button
          className="tb-btn tb-btn-primary"
          onClick={() => {
            if (user.role === 'enseignant') navigate('/saisie');
            else if (user.role === 'admin') navigate('/admin');
          }}
        >
          {user.cta}
        </button>
      </div>
    </header>
  );
}
