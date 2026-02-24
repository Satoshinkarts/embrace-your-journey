
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('customer', 'rider', 'dispatcher', 'operator', 'admin');

-- Ride status enum
CREATE TYPE public.ride_status AS ENUM ('requested', 'accepted', 'en_route', 'picked_up', 'completed', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Vehicles table (for riders)
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'motorcycle',
  make TEXT,
  model TEXT,
  color TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can manage their own vehicles" ON public.vehicles FOR ALL USING (auth.uid() = rider_id);
CREATE POLICY "Admins can view all vehicles" ON public.vehicles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators can view all vehicles" ON public.vehicles FOR SELECT USING (public.has_role(auth.uid(), 'operator'));

-- Rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  rider_id UUID REFERENCES auth.users(id),
  dispatcher_id UUID REFERENCES auth.users(id),
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  status ride_status NOT NULL DEFAULT 'requested',
  fare NUMERIC(10,2),
  distance_km NUMERIC(10,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own rides" ON public.rides FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create rides" ON public.rides FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Riders can view assigned rides" ON public.rides FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can update assigned rides" ON public.rides FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Dispatchers can view all rides" ON public.rides FOR SELECT USING (public.has_role(auth.uid(), 'dispatcher'));
CREATE POLICY "Dispatchers can update rides" ON public.rides FOR UPDATE USING (public.has_role(auth.uid(), 'dispatcher'));
CREATE POLICY "Admins can view all rides" ON public.rides FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators can view all rides" ON public.rides FOR SELECT USING (public.has_role(auth.uid(), 'operator'));

-- Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES auth.users(id) NOT NULL,
  rated_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings about them" ON public.ratings FOR SELECT USING (auth.uid() = rated_id OR auth.uid() = rater_id);
CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  -- Default role: customer
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
