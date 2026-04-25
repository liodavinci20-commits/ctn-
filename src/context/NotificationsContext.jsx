import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext();

const formatNotif = (row) => ({
  id:         row.id,
  toUserId:   row.to_user_id,
  fromUserId: row.from_user_id,
  fromName:   row.from_name,
  fromRole:   row.from_role,
  type:       row.type,
  title:      row.title,
  body:       row.body,
  read:       row.read,
  time:       row.created_at,
});

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }

    fetchNotifications();

    // Realtime : nouvelles notifications reçues sans refresh
    channelRef.current = supabase
      .channel(`notifs_${user.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `to_user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [formatNotif(payload.new), ...prev]);
      })
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user?.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur fetch notifications:', error.message);
    else setNotifications((data || []).map(formatNotif));
    setLoading(false);
  };

  // Compatibilité avec les pages qui appellent getNotificationsFor(userId)
  const getNotificationsFor = () => notifications;

  const unreadCountFor = () => notifications.filter(n => !n.read).length;

  const markOneRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('to_user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // notif = { toUserId (uuid), title, body, type }
  const sendNotification = async (notif) => {
    const { error } = await supabase.from('notifications').insert({
      from_user_id: user.id,
      to_user_id:   notif.toUserId,
      from_name:    user.name  || '',
      from_role:    user.role  || '',
      type:         notif.type || 'info',
      title:        notif.title,
      body:         notif.body,
    });
    if (error) throw error;
  };

  return (
    <NotificationsContext.Provider value={{
      notifications, loading,
      getNotificationsFor, unreadCountFor,
      markAllRead, markOneRead, sendNotification, fetchNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
