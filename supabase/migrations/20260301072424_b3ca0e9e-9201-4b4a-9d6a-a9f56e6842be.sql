-- Zone / Territory System

CREATE TABLE public.zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  premium_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  boundary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.operator_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id, zone_id)
);

ALTER TABLE public.rides ADD COLUMN zone_id UUID REFERENCES public.zones(id);

INSERT INTO public.zones (name, slug, description) VALUES
  ('Jaro', 'jaro', 'Jaro district'),
  ('Mandurriao', 'mandurriao', 'Mandurriao district'),
  ('City Proper', 'city-proper', 'Iloilo City Proper'),
  ('La Paz', 'la-paz', 'La Paz district'),
  ('Arevalo', 'arevalo', 'Arevalo district'),
  ('Molo', 'molo', 'Molo district');

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Admins can insert zones" ON public.zones FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update zones" ON public.zones FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete zones" ON public.zones FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "View own or admin zone assignments" ON public.operator_zones FOR SELECT USING (operator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins assign zones" ON public.operator_zones FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove zone assignments" ON public.operator_zones FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;