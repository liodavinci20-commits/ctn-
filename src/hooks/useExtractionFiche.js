import { useState } from 'react';
import { supabase } from '../supabaseClient';

function genId() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── DÉTECTION DU TYPE DE LIGNE ────────────────────────────────────
function detectRowType(titre) {
  const t = (titre || '').toLowerCase();
  if (/[ée]valuation/.test(t)) return 'evaluation';
  if (/activit[ée]/.test(t))   return 'activite';
  if (/cong[eé]s|vacances|f[eé]ri[eé]|no[eë]l/.test(t)) return 'vacances';
  return 'cours';
}

// ── 1. DÉDUPLICATION ──────────────────────────────────────────────
function deduplicateItems(items) {
  const result = [];
  for (const item of items) {
    const dup = result.some(r =>
      Math.abs(r.x - item.x) < 4 &&
      Math.abs(r.y - item.y) < 4 &&
      r.str === item.str
    );
    if (!dup) result.push(item);
  }
  return result;
}

// ── 2. GROUPEMENT EN LIGNES VISUELLES ─────────────────────────────
function groupIntoRows(items, threshold = 8) {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const rows   = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const lastY = rows[rows.length - 1][0].y;
    if (Math.abs(sorted[i].y - lastY) <= threshold) {
      rows[rows.length - 1].push(sorted[i]);
    } else {
      rows.push([sorted[i]]);
    }
  }
  return rows.map(r => r.sort((a, b) => a.x - b.x));
}

// ── 3. DÉTECTION DE L'EN-TÊTE ─────────────────────────────────────
const HEADER_KEYWORDS = ['semaine', 'module', 'titre', 'leçon', 'nature', 'enseignement', 'unité'];

function findHeaderRowIndex(rows) {
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < rows.length; i++) {
    const text  = rows[i].map(x => x.str.toLowerCase()).join(' ');
    const score = HEADER_KEYWORDS.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestScore >= 2 ? bestIdx : -1;
}

// ── 4. MAP DE COLONNES depuis l'en-tête ───────────────────────────
const HEADER_TO_COL = {
  'semaine':       'semaine',
  'module':        'module',
  'titre':         'titre',
  'leçon':         'titre',
  'enseignement':  'titre',
  'unité':         'titre',
  'nature':        'nature',
  'lt':            'nature',
  'lp':            'nature',
};

function buildColumnMap(headerRows) {
  const positions = {};
  for (const row of headerRows) {
    row.forEach(item => {
      const text = ' ' + item.str.toLowerCase() + ' ';
      for (const [kw, col] of Object.entries(HEADER_TO_COL)) {
        if (text.includes(kw) && !positions[col]) {
          positions[col] = item.x;
        }
      }
    });
  }
  return positions;
}

// Assigne un item à la colonne la plus proche à sa gauche
function assignColumn(itemX, colMap) {
  const cols = Object.entries(colMap).sort((a, b) => a[1] - b[1]);
  if (!cols.length) return null;
  let assigned = cols[0][0];
  for (const [col, x] of cols) {
    if (itemX >= x - 5) assigned = col;
    else break;
  }
  return assigned;
}

// ── 5. PARSING PRINCIPAL ──────────────────────────────────────────
// Ancre sur les patterns de date (ex: "08/09", "15/09 au 12/09/25")
// ou sur des numéros de semaine (1–52) selon le format du document
function parseTableFromItems(items) {
  const clean   = deduplicateItems(items);
  const allRows = groupIntoRows(clean, 8);

  // Détection de l'en-tête
  const headerIdx  = findHeaderRowIndex(allRows);
  const headerRows = headerIdx >= 0 ? allRows.slice(headerIdx, headerIdx + 2) : [];
  let colMap       = buildColumnMap(headerRows);

  // Fallback proportionnel si en-tête non trouvé
  if (Object.keys(colMap).length < 3) {
    const xs   = clean.map(i => i.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const W    = maxX - minX;
    colMap = {
      semaine: minX + W * 0.00,
      module:  minX + W * 0.22,
      titre:   minX + W * 0.38,
      nature:  minX + W * 0.92,
    };
  }

  // Données sous l'en-tête
  const headerY   = headerIdx >= 0 ? allRows[headerIdx][0].y : 0;
  const dataItems = clean.filter(i => i.y > headerY + 5);

  // ── Cherche les ancrages de ligne ─────────────────────────────
  // Priorité 1 : date "dd/mm" ou "dd/mm/yy"
  const DATE_PATTERN = /^\d{1,2}\/\d{2}/;
  let anchorItems = dataItems
    .filter(item => DATE_PATTERN.test(item.str.trim()))
    .sort((a, b) => a.y - b.y);

  // Priorité 2 : numéros de semaine 1–52
  if (!anchorItems.length) {
    anchorItems = dataItems
      .filter(item => /^\d{1,2}$/.test(item.str.trim()) && +item.str >= 1 && +item.str <= 52)
      .sort((a, b) => a.y - b.y);
  }

  // Priorité 3 : parse ligne par ligne si aucun ancrage
  if (!anchorItems.length) {
    return groupIntoRows(dataItems, 8).map(row => {
      const r = { semaine:'', module:'', titre:'', nature:'', type:'cours', fait: false, id: genId() };
      row.forEach(item => {
        const col = assignColumn(item.x, colMap);
        if (col && col in r) r[col] = r[col] ? r[col] + ' ' + item.str : item.str;
      });
      r.type = detectRowType(r.titre);
      return r;
    }).filter(r => Object.entries(r).some(([k, v]) => k !== 'id' && typeof v === 'string' && v.trim()));
  }

  // ── Construction des lignes du tableau ────────────────────────
  const tableRows = [];

  anchorItems.forEach((anchor, i) => {
    const yStart = anchor.y - 6;
    const yEnd   = i < anchorItems.length - 1 ? anchorItems[i + 1].y - 6 : Infinity;

    const rowItems = dataItems.filter(item => item.y >= yStart && item.y < yEnd);

    const row = { semaine: anchor.str, module:'', titre:'', nature:'', type:'cours', fait: false, id: genId() };

    // Agrège le texte par colonne (sauf l'ancre elle-même dans sa colonne)
    const colBuckets = {};
    rowItems.forEach(item => {
      if (item.str === anchor.str && Math.abs(item.x - anchor.x) < 5) return;
      const col = assignColumn(item.x, colMap);
      if (col && col in row) {
        colBuckets[col] = colBuckets[col] ? colBuckets[col] + ' ' + item.str : item.str;
      }
    });

    Object.assign(row, colBuckets);

    // Nettoyage des espaces
    Object.keys(row).forEach(k => {
      if (typeof row[k] === 'string') row[k] = row[k].trim().replace(/\s{2,}/g, ' ');
    });

    row.type = detectRowType(row.titre);
    tableRows.push(row);
  });

  // Propagation des cellules fusionnées (module uniquement)
  let prevModule = '';
  return tableRows.map(row => {
    if (row.module) prevModule = row.module;
    else            row.module = prevModule;
    return row;
  });
}

// ── 6. EXTRACTION PDF ─────────────────────────────────────────────
async function extractItemsFromPDF(file, onProgress) {
  onProgress('Chargement du moteur PDF…');
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  onProgress('Lecture du fichier…');
  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allItems = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress(`Page ${p}/${pdf.numPages}…`);
    const page        = await pdf.getPage(p);
    const viewport    = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    textContent.items.forEach(item => {
      if (!item.str?.trim()) return;
      const tx = item.transform;
      allItems.push({
        str:    item.str.trim(),
        x:      tx[4],
        y:      viewport.height - tx[5],
        width:  item.width  || 0,
        height: item.height || 0,
        page:   p,
      });
    });
  }
  return allItems;
}

// ── 7. OCR IMAGE ──────────────────────────────────────────────────
async function extractTextFromImage(file, onProgress) {
  onProgress('Chargement du moteur OCR…');
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('fra', 1, {
    logger: m => {
      if (m.status === 'recognizing text')
        onProgress(`OCR : ${Math.round(m.progress * 100)}%`);
    },
  });
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

function parseOCRText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows  = [];
  let buf     = null;

  const flush = () => {
    if (buf?.semaine) {
      buf.type = detectRowType(buf.titre);
      rows.push({ ...buf, id: genId() });
    }
  };

  lines.forEach(line => {
    // Ancre sur "dd/mm" ou "dd/mm/yy"
    if (/^\d{1,2}\/\d{2}/.test(line)) {
      flush();
      buf = { semaine: line, module: '', titre: '', nature: '', fait: false };
      return;
    }
    if (!buf) return;
    if (/^LT\/LP|^LT$|^LP$/i.test(line)) { buf.nature = line; return; }
    buf.titre = (buf.titre ? buf.titre + ' ' : '') + line;
  });
  flush();
  return rows;
}

// ── HOOK ──────────────────────────────────────────────────────────
export function useExtractionFiche(userId) {
  const [extracting, setExtracting] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [progress,   setProgress]   = useState('');

  const extraireEtStructurer = async (file) => {
    setExtracting(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let rows  = [];

      if (ext === 'pdf') {
        const items = await extractItemsFromPDF(file, setProgress);
        setProgress('Structuration du tableau…');
        rows = parseTableFromItems(items);

      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        const text = await extractTextFromImage(file, setProgress);
        setProgress('Structuration…');
        rows = parseOCRText(text);

      } else {
        throw new Error('Format non supporté. Utilisez PDF, JPG ou PNG.');
      }

      if (!rows.length) {
        throw new Error('Aucune donnée détectée. Vérifiez que le PDF contient du texte sélectionnable (non scanné).');
      }

      setProgress('');
      return rows;
    } finally {
      setExtracting(false);
    }
  };

  const sauvegarderContenu = async (rows, { classeId, classeNom, ficheId, annee }) => {
    setSaving(true);
    try {
      // Calcul de l'avancement
      const done  = rows.filter(r => r.fait).length;
      const total = rows.length;

      // Upsert lignes dans fiches_progression_contenu
      const { data: existing } = await supabase
        .from('fiches_progression_contenu')
        .select('id')
        .eq('teacher_id', userId)
        .eq('classe_id',  classeId)
        .eq('annee',      annee)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('fiches_progression_contenu')
          .update({ lignes: rows })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('fiches_progression_contenu')
          .insert({
            teacher_id: userId,
            classe_id:  classeId || null,
            classe_nom: classeNom,
            fiche_id:   ficheId  || null,
            annee,
            lignes:     rows,
          });
      }

      // Upsert avancement dans progression_avancement (pour le Suivi Collectif)
      await supabase
        .from('progression_avancement')
        .upsert(
          { teacher_id: userId, classe_id: classeId || null, classe_nom: classeNom, annee, done, total },
          { onConflict: 'teacher_id,classe_id,annee' }
        );
    } finally {
      setSaving(false);
    }
  };

  const chargerContenu = async (classeId, annee) => {
    const { data } = await supabase
      .from('fiches_progression_contenu')
      .select('lignes')
      .eq('teacher_id', userId)
      .eq('classe_id',  classeId)
      .eq('annee',      annee)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lignes = data?.lignes || null;
    // Garantit que le champ fait existe sur les anciennes lignes sauvegardées
    return lignes ? lignes.map(r => ({ fait: false, ...r })) : null;
  };

  return { extracting, saving, progress, extraireEtStructurer, sauvegarderContenu, chargerContenu };
}
