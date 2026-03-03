
-- Auto-log booking events when ride status changes
CREATE OR REPLACE FUNCTION public.auto_log_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_events (ride_id, event_type, actor_id, actor_role, metadata)
    VALUES (
      NEW.id,
      NEW.status::text,
      COALESCE(auth.uid(), NEW.customer_id),
      CASE
        WHEN NEW.status = 'requested' THEN 'customer'
        WHEN NEW.status IN ('accepted', 'en_route', 'picked_up', 'completed') THEN 'rider'
        WHEN NEW.status = 'cancelled' THEN
          CASE WHEN NEW.cancel_reason ILIKE '%customer%' THEN 'customer' ELSE 'system' END
        ELSE 'system'
      END,
      jsonb_build_object(
        'from_status', OLD.status::text,
        'to_status', NEW.status::text,
        'fare', NEW.fare,
        'rider_id', NEW.rider_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on rides table for status changes
CREATE TRIGGER trg_auto_log_booking_event
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_booking_event();

-- Also log initial ride creation
CREATE OR REPLACE FUNCTION public.auto_log_ride_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.booking_events (ride_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    NEW.id,
    'requested',
    NEW.customer_id,
    'customer',
    jsonb_build_object('pickup', NEW.pickup_address, 'dropoff', NEW.dropoff_address)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_log_ride_created
  AFTER INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_ride_created();
