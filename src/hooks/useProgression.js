import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function useProgression(userId) {
  const [fiches, setFiches]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userId) fetchFiches();
  }, [userId]);

  const fetchFiches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fiches_progression')
      .select('*, classe:classe_id(nom, effectif)')
      .order('created_at', { ascending: false });

    if (error) console.error('Erreur fetch fiches_progression:', error.message);
    else setFiches(data || []);
    setLoading(false);
  };

  const uploadFiche = async (file, { classeId, classeNom, matiere, annee }) => {
    setUploading(true);

    const path = `progressions/${userId}/${Date.now()}_${file.name}`;

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

    // Si une fiche existe déjà pour cette classe + année → remplace
    const existing = fiches.find(
      f => f.classe_id === classeId && f.annee === annee
    );

    if (existing) {
      await supabase.from('fiches_progression').update({
        nom_fichier: file.name,
        fichier_url: publicUrl,
        taille:      formatSize(file.size),
        matiere,
      }).eq('id', existing.id);

      // Supprime l'ancien fichier du Storage
      const oldParts = existing.fichier_url.split('/resources/');
      if (oldParts.length > 1) {
        await supabase.storage.from('resources').remove([oldParts[1]]);
      }
    } else {
      await supabase.from('fiches_progression').insert({
        teacher_id:  userId,
        classe_id:   classeId || null,
        classe_nom:  classeNom,
        matiere,
        annee,
        nom_fichier: file.name,
        fichier_url: publicUrl,
        taille:      formatSize(file.size),
      });
    }

    await fetchFiches();
    setUploading(false);
  };

  const deleteFiche = async (fiche) => {
    await supabase.from('fiches_progression').delete().eq('id', fiche.id);

    const urlParts = fiche.fichier_url.split('/resources/');
    if (urlParts.length > 1) {
      await supabase.storage.from('resources').remove([urlParts[1]]);
    }

    await fetchFiches();
  };

  return { fiches, loading, uploading, uploadFiche, deleteFiche, refetch: fetchFiches };
}
