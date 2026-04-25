-- ============================================================
-- CTN LYCÉE — Base de données Supabase
-- Intégration progressive — colle une étape à la fois
-- ============================================================


-- ============================================================
-- ÉTAPE 1 : AUTHENTIFICATION & PROFILS
-- ============================================================

CREATE TABLE public.profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            text NOT NULL DEFAULT '',
  nom              text NOT NULL DEFAULT '',
  prenom           text NOT NULL DEFAULT '',
  role             text NOT NULL DEFAULT 'enseignant'
                   CHECK (role IN ('enseignant', 'conseiller', 'admin')),
  matricule        text,
  avatar_url       text,
  avatar_initials  text,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role, matricule, avatar_initials)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'enseignant'),
    COALESCE(NEW.raw_user_meta_data->>'matricule', ''),
    UPPER(
      LEFT(COALESCE(NEW.raw_user_meta_data->>'prenom', '?'), 1) ||
      LEFT(COALESCE(NEW.raw_user_meta_data->>'nom', '?'), 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout authentifié peut lire les profils"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Un utilisateur modifie son propre profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ============================================================
-- ÉTAPE 2 : CLASSES & PHOTO DE PROFIL
-- ============================================================

CREATE TABLE public.classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text NOT NULL,
  niveau     text,
  filiere    text,
  effectif   integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.profile_classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classe_id  uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, classe_id)
);

INSERT INTO public.classes (nom, niveau, filiere, effectif) VALUES
  ('Terminale C', 'Terminale', 'Scientifique', 32),
  ('Terminale D', 'Terminale', 'Scientifique', 35),
  ('1ère C',      'Première',  'Scientifique', 30),
  ('1ère D',      'Première',  'Scientifique', 28),
  ('2nde C',      'Seconde',   'Scientifique', 40),
  ('2nde A',      'Seconde',   'Littéraire',   38);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout authentifié peut lire les classes"
  ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tout authentifié peut lire profile_classes"
  ON public.profile_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enseignant gère ses classes assignées"
  ON public.profile_classes FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Enseignant retire ses classes assignées"
  ON public.profile_classes FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- Storage bucket avatars (créer le bucket manuellement dans Supabase)
CREATE POLICY "Upload avatar autorisé"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Mise à jour avatar autorisée"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Lecture avatars publique"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "Suppression avatar autorisée"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');


-- ============================================================
-- ÉTAPE 3 : SÉANCES PÉDAGOGIQUES
-- ============================================================

CREATE TABLE public.sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classe_id        uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  matiere          text NOT NULL DEFAULT '',
  date_cours       date NOT NULL DEFAULT CURRENT_DATE,
  titre            text NOT NULL DEFAULT '',
  sous_titre       text,
  plan             text,
  contenu          text,
  type_seance      text DEFAULT 'Cours',
  duree            text,
  sequence         text,
  numero_seance    integer,
  effectif_present integer DEFAULT 0,
  effectif_total   integer DEFAULT 0,
  progression      text,
  observations     text,
  signature        text,
  geo_lat          float,
  geo_lng          float,
  geo_time         timestamptz,
  status           text DEFAULT 'done',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE public.session_competences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  texte      text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.session_devoirs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  description text NOT NULL,
  date_limite date,
  created_at  timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignant voit ses séances"
  ON public.sessions FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('conseiller','admin')));
CREATE POLICY "Enseignant crée ses séances"
  ON public.sessions FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Enseignant modifie ses séances"
  ON public.sessions FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Enseignant supprime ses séances"
  ON public.sessions FOR DELETE TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Accès compétences si accès séance"
  ON public.session_competences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('conseiller','admin')))));
CREATE POLICY "Enseignant gère ses compétences"
  ON public.session_competences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()));

CREATE POLICY "Accès devoirs si accès séance"
  ON public.session_devoirs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('conseiller','admin')))));
CREATE POLICY "Enseignant gère ses devoirs"
  ON public.session_devoirs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid()));


-- ============================================================
-- ÉTAPE 3b : RESSOURCES PÉDAGOGIQUES
-- ============================================================

CREATE TABLE public.resources (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nom        text NOT NULL,
  type       text NOT NULL DEFAULT 'autre'
             CHECK (type IN ('pdf', 'video', 'image', 'lien', 'autre')),
  url        text NOT NULL,
  taille     text,
  classe     text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignant gère ses ressources"
  ON public.resources FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Tout authentifié peut lire les ressources"
  ON public.resources FOR SELECT TO authenticated USING (true);

-- Storage bucket resources (créer le bucket manuellement dans Supabase)
CREATE POLICY "Upload ressources autorisé"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources');
CREATE POLICY "Lecture ressources publique"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'resources');
CREATE POLICY "Suppression ressources autorisée"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources');


-- ============================================================
-- ÉTAPE 4 : EMPLOI DU TEMPS
-- ============================================================

CREATE TABLE public.courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jour        text NOT NULL,
  heure_debut text NOT NULL,
  heure_fin   text NOT NULL,
  matiere     text NOT NULL DEFAULT '',
  classe      text NOT NULL DEFAULT '',
  salle       text DEFAULT '',
  couleur     text DEFAULT 'blue',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignant voit son EDT, admin/conseiller voient tout"
  ON public.courses FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','conseiller')));
CREATE POLICY "Enseignant crée ses cours"
  ON public.courses FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Enseignant modifie ses cours"
  ON public.courses FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Enseignant supprime ses cours"
  ON public.courses FOR DELETE TO authenticated USING (teacher_id = auth.uid());


-- ============================================================
-- ÉTAPE 5 : NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_name    text NOT NULL DEFAULT '',
  from_role    text NOT NULL DEFAULT '',
  type         text NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'warn', 'success')),
  title        text NOT NULL,
  body         text NOT NULL,
  read         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur voit ses notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (to_user_id = auth.uid());
CREATE POLICY "Tout authentifié peut envoyer une notification"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Utilisateur marque ses notifications comme lues"
  ON public.notifications FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());


-- ============================================================
-- ÉTAPE 6 : RATTRAPAGES
-- ============================================================

CREATE TABLE public.rattrapages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name  text NOT NULL DEFAULT '',
  classe        text NOT NULL DEFAULT '',
  classe_id     uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  date_proposee date NOT NULL,
  creneau       text NOT NULL DEFAULT '',
  motif         text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.rattrapages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignant voit ses rattrapages"
  ON public.rattrapages FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','conseiller')));
CREATE POLICY "Enseignant soumet un rattrapage"
  ON public.rattrapages FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Admin approuve ou rejette"
  ON public.rattrapages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ============================================================
-- ÉTAPE 7 : MATIÈRES, PROGRAMMES & PROGRESSION
-- ============================================================

-- Matières enseignées
CREATE TABLE public.matieres (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.matieres (nom, code) VALUES
  ('Mathématiques',       'MATH'),
  ('Physique-Chimie',     'PC'),
  ('Informatique',        'INFO'),
  ('Français',            'FR'),
  ('Histoire-Géographie', 'HG'),
  ('Anglais',             'ANG'),
  ('SVT',                 'SVT'),
  ('Philosophie',         'PHILO');

-- Jointure enseignant ↔ matières
CREATE TABLE public.profile_matieres (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  UNIQUE(profile_id, matiere_id)
);

-- Programme officiel par classe + matière (défini par admin)
CREATE TABLE public.programmes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id  uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  annee      text DEFAULT '2024-2025',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(classe_id, matiere_id, annee)
);

-- Chapitres du programme
CREATE TABLE public.programme_chapitres (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  titre        text NOT NULL,
  description  text,
  ordre        integer NOT NULL DEFAULT 1,
  created_at   timestamptz DEFAULT now()
);

-- Progression : chapitres couverts par chaque enseignant
CREATE TABLE public.teacher_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapitre_id  uuid NOT NULL REFERENCES public.programme_chapitres(id) ON DELETE CASCADE,
  session_id   uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, chapitre_id)
);

ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_chapitres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture matieres pour tous"
  ON public.matieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gère les matières"
  ON public.matieres FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Lecture profile_matieres pour tous"
  ON public.profile_matieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enseignant gère ses matières"
  ON public.profile_matieres FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Enseignant supprime ses matières"
  ON public.profile_matieres FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Lecture programmes pour tous"
  ON public.programmes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gère les programmes"
  ON public.programmes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Lecture chapitres pour tous"
  ON public.programme_chapitres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gère les chapitres"
  ON public.programme_chapitres FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Enseignant voit sa progression"
  ON public.teacher_progress FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','conseiller')));
CREATE POLICY "Enseignant enregistre sa progression"
  ON public.teacher_progress FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Enseignant retire un chapitre"
  ON public.teacher_progress FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());
