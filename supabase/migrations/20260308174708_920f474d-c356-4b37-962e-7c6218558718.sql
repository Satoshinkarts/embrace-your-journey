
CREATE TABLE public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'custom',
  name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_locations_label_check CHECK (label IN ('home', 'work', 'custom'))
);

ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved locations"
  ON public.saved_locations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved locations"
  ON public.saved_locations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved locations"
  ON public.saved_locations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved locations"
  ON public.saved_locations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX saved_locations_user_home ON public.saved_locations (user_id) WHERE label = 'home';
CREATE UNIQUE INDEX saved_locations_user_work ON public.saved_locations (user_id) WHERE label = 'work';
