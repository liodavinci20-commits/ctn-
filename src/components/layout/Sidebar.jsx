import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { MENUS } from '../../data/mockData';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCountFor } = useNotifications();

  if (!user) return null;

  const navItems = MENUS[user.role] || MENUS['enseignant'];
  const unreadCount = unreadCountFor(user.id);

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-wrap">
          <div className="sb-logo">C</div>
          <div>
            <div className="sb-title">CTN Lycée</div>
            <div className="sb-sub">Cahier de Texte Num.</div>
          </div>
        </div>
      </div>

      <div className="sb-user">
        <div className="sb-user-av" id="sb-av" style={{ overflow: 'hidden', padding: 0 }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            : user.av
          }
        </div>
        <div>
          <div className="sb-user-name" id="sb-name">{user.name}</div>
          <div className="sb-user-role" id="sb-role">{user.role}</div>
        </div>
      </div>

      <div className="sb-section-label">Navigation</div>
      <nav className="sb-nav" id="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.id} 
            to={item.path}
            className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}
          >
            <span className="sb-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'notifications' && unreadCount > 0 && (
              <span className="sb-badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sb-bottom">
        <div className="sb-logout" onClick={() => logout()}>
          <span className="sb-icon">⇤</span>
          <span>Déconnexion</span>
        </div>
      </div>
    </aside>
  );
}
