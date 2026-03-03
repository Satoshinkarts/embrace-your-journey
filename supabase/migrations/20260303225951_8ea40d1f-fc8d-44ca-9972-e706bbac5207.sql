
-- Networks table (Partner Operators)
CREATE TABLE public.networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'banned')),
  description TEXT,
  license_doc_url TEXT,
  logo_url TEXT,
  verified_at TIMESTAMPTZ,
  max_seats INTEGER NOT NULL DEFAULT 30,
  subscription_fee NUMERIC NOT NULL DEFAULT 35000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Network members (riders and dispatchers belonging to a network)
CREATE TABLE public.network_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'rider' CHECK (role IN ('rider', 'dispatcher')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  UNIQUE(network_id, user_id)
);

-- Booking events (append-only audit log)
CREATE TABLE public.booking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Strikes table
CREATE TABLE public.strikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE,
  user_id UUID,
  issued_by UUID NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'suspension', 'ban')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Network zones junction (which zones a network operates in)
CREATE TABLE public.network_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(network_id, zone_id)
);

-- Add network_id to rides
ALTER TABLE public.rides ADD COLUMN network_id UUID REFERENCES public.networks(id);

-- Enable RLS on all new tables
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_zones ENABLE ROW LEVEL SECURITY;

-- RLS: networks
CREATE POLICY "Anyone can view approved networks" ON public.networks FOR SELECT USING (status = 'approved' OR owner_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on networks" ON public.networks FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators can insert own network" ON public.networks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own network" ON public.networks FOR UPDATE USING (auth.uid() = owner_id);

-- RLS: network_members
CREATE POLICY "Admins full access on network_members" ON public.network_members FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Network owners can manage members" ON public.network_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.networks n WHERE n.id = network_members.network_id AND n.owner_id = auth.uid())
);
CREATE POLICY "Members can view own membership" ON public.network_members FOR SELECT USING (auth.uid() = user_id);

-- RLS: booking_events (append-only)
CREATE POLICY "Admins full access on booking_events" ON public.booking_events FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators can view booking events" ON public.booking_events FOR SELECT USING (has_role(auth.uid(), 'operator'));
CREATE POLICY "Dispatchers can view booking events" ON public.booking_events FOR SELECT USING (has_role(auth.uid(), 'dispatcher'));
CREATE POLICY "Authenticated can insert booking events" ON public.booking_events FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Riders can view own booking events" ON public.booking_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.rides r WHERE r.id = booking_events.ride_id AND (r.rider_id = auth.uid() OR r.customer_id = auth.uid()))
);

-- RLS: strikes
CREATE POLICY "Admins full access on strikes" ON public.strikes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators can view network strikes" ON public.strikes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.networks n WHERE n.id = strikes.network_id AND n.owner_id = auth.uid())
);
CREATE POLICY "Admins can insert strikes" ON public.strikes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: network_zones
CREATE POLICY "Anyone can view network zones" ON public.network_zones FOR SELECT USING (true);
CREATE POLICY "Admins full access on network_zones" ON public.network_zones FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger for networks
CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON public.networks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for booking_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_events;
