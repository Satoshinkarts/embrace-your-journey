
-- Fix: Riders need to see requested rides (rider_id is NULL initially)
-- and accept them by setting rider_id

-- Drop restrictive rider policies on rides and recreate as permissive
DROP POLICY IF EXISTS "Riders can view assigned rides" ON public.rides;
DROP POLICY IF EXISTS "Riders can update assigned rides" ON public.rides;
DROP POLICY IF EXISTS "Customers can view their own rides" ON public.rides;
DROP POLICY IF EXISTS "Customers can create rides" ON public.rides;
DROP POLICY IF EXISTS "Dispatchers can view all rides" ON public.rides;
DROP POLICY IF EXISTS "Dispatchers can update rides" ON public.rides;
DROP POLICY IF EXISTS "Admins can view all rides" ON public.rides;
DROP POLICY IF EXISTS "Operators can view all rides" ON public.rides;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Customers can view own rides" ON public.rides FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create rides" ON public.rides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can cancel own rides" ON public.rides FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id AND status = 'requested');

-- Riders can see requested rides (available) AND their own assigned rides
CREATE POLICY "Riders can view available and assigned rides" ON public.rides FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'rider') AND status = 'requested' AND rider_id IS NULL)
    OR auth.uid() = rider_id
  );

-- Riders can accept requested rides or update their assigned rides
CREATE POLICY "Riders can update rides" ON public.rides FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'rider') AND status = 'requested' AND rider_id IS NULL)
    OR auth.uid() = rider_id
  );

CREATE POLICY "Dispatchers can view all rides" ON public.rides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Dispatchers can update rides" ON public.rides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Dispatchers can insert rides" ON public.rides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Operators can view all rides" ON public.rides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Admins can do everything on rides" ON public.rides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles policies  
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix profiles policies - admins/dispatchers/operators need to see rider names
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispatchers can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Operators can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user to assign demo roles based on email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  IF NEW.email LIKE 'demo-rider@%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rider');
  ELSIF NEW.email LIKE 'demo-dispatcher@%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'dispatcher');
  ELSIF NEW.email LIKE 'demo-operator@%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  ELSIF NEW.email LIKE 'demo-admin@%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix ratings policies
DROP POLICY IF EXISTS "Users can view ratings about them" ON public.ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON public.ratings;

CREATE POLICY "Users can view ratings" ON public.ratings FOR SELECT TO authenticated
  USING (auth.uid() = rated_id OR auth.uid() = rater_id);

CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);

-- Fix vehicles policies
DROP POLICY IF EXISTS "Riders can view their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Riders can manage their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Operators can view all vehicles" ON public.vehicles;

CREATE POLICY "Riders can view own vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (auth.uid() = rider_id);

CREATE POLICY "Riders can manage own vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (auth.uid() = rider_id);

CREATE POLICY "Admins can view all vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can view all vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can update vehicles" ON public.vehicles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));
