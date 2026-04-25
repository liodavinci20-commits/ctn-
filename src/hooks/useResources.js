import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ICONS = { pdf: '📄', video: '▶', image: '⬦', lien: '⊹', autre: '◎' };
const TYPE_CSS = { pdf: 'res-pdf', video: 'res-vid', image: 'res-img', lien: 'res-lnk', autre: 'res-pdf' };

function detectType(file) {
  const mime = file.type;
  if (mime.includes('pdf'))   return 'pdf';
  if (mime.includes('video')) return 'video';
  if (mime.includes('image')) return 'image';
  return 'autre';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function useResources(userId) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userId) fetchResources();
  }, [userId]);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur fetch resources:', error.message);
    else setResources((data || []).map(r => ({
      ...r,
      icon:    ICONS[r.type]    || '◎',
      typeCSS: TYPE_CSS[r.type] || 'res-pdf',
    })));
    setLoading(false);
  };

  // Upload un fichier dans Storage puis enregistre les métadonnées
  const uploadFile = async (file, classe = '') => {
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}_${file.name}`;
    const type = detectType(file);

    const { error: storageError } = await supabase.storage
      .from('resources')
      .upload(path, file, { upsert: false });

    if (storageError) {
      setUploading(false);
      throw new Error(storageError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(path);

    const { error: dbError } = await supabase.from('resources').insert({
      teacher_id: userId,
      nom:        file.name,
      type,
      url:        publicUrl,
      taille:     formatSize(file.size),
      classe:     classe || 'Toutes',
    });

    if (dbError) throw new Error(dbError.message);

    await fetchResources();
    setUploading(false);
  };

  // Ajoute un lien externe (pas de fichier)
  const addLink = async ({ nom, url, classe }) => {
    const { error } = await supabase.from('resources').insert({
      teacher_id: userId,
      nom,
      type:   'lien',
      url,
      taille: '',
      classe: classe || 'Toutes',
    });
    if (error) throw new Error(error.message);
    await fetchResources();
  };

  // Supprime une ressource (DB + Storage si fichier)
  const deleteResource = async (resource) => {
    await supabase.from('resources').delete().eq('id', resource.id);

    // Si c'est un fichier Storage (pas un lien externe), on le supprime aussi
    if (resource.type !== 'lien') {
      const urlParts = resource.url.split('/resources/');
      if (urlParts.length > 1) {
        await supabase.storage.from('resources').remove([urlParts[1]]);
      }
    }

    await fetchResources();
  };

  // Stats calculées depuis les données
  const stats = {
    pdf:    resources.filter(r => r.type === 'pdf').length,
    video:  resources.filter(r => r.type === 'video').length,
    image:  resources.filter(r => r.type === 'image').length,
    lien:   resources.filter(r => r.type === 'lien').length,
    total:  resources.length,
  };

  return { resources, loading, uploading, uploadFile, addLink, deleteResource, stats, refetch: fetchResources };
}
