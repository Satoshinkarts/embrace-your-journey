
-- Function: get a single rider's ranking (only accessible by the rider themselves, operators, or admins)
CREATE OR REPLACE FUNCTION public.get_rider_ranking(_rider_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- RBAC: caller must be the rider, operator, or admin
  IF auth.uid() != _rider_id
     AND NOT has_role(auth.uid(), 'operator')
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH rider_stats AS (
    SELECT
      ur.user_id,
      COALESCE(AVG(rt.rating), 0) as avg_rating,
      COUNT(DISTINCT rt.id) as total_reviews,
      COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_rides
    FROM user_roles ur
    LEFT JOIN ratings rt ON rt.rated_id = ur.user_id
    LEFT JOIN rides r ON r.rider_id = ur.user_id AND r.status = 'completed'
    WHERE ur.role = 'rider'
    GROUP BY ur.user_id
  ),
  ranked AS (
    SELECT
      user_id,
      avg_rating,
      total_reviews,
      completed_rides,
      RANK() OVER (ORDER BY avg_rating DESC, completed_rides DESC) as rank_position,
      COUNT(*) OVER () as total_riders
    FROM rider_stats
  )
  SELECT json_build_object(
    'rank_position', COALESCE(rank_position, 0),
    'total_riders', COALESCE(total_riders, 0),
    'avg_rating', ROUND(avg_rating::numeric, 2),
    'total_reviews', total_reviews,
    'completed_rides', completed_rides
  ) INTO result
  FROM ranked
  WHERE user_id = _rider_id;

  IF result IS NULL THEN
    result := json_build_object(
      'rank_position', 0,
      'total_riders', 0,
      'avg_rating', 0,
      'total_reviews', 0,
      'completed_rides', 0
    );
  END IF;

  RETURN result;
END;
$$;

-- Function: get all rider rankings (operators and admins only)
CREATE OR REPLACE FUNCTION public.get_all_rider_rankings()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT has_role(auth.uid(), 'operator') AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH rider_stats AS (
    SELECT
      ur.user_id,
      p.full_name,
      COALESCE(AVG(rt.rating), 0) as avg_rating,
      COUNT(DISTINCT rt.id) as total_reviews,
      COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_rides
    FROM user_roles ur
    LEFT JOIN profiles p ON p.user_id = ur.user_id
    LEFT JOIN ratings rt ON rt.rated_id = ur.user_id
    LEFT JOIN rides r ON r.rider_id = ur.user_id AND r.status = 'completed'
    WHERE ur.role = 'rider'
    GROUP BY ur.user_id, p.full_name
  ),
  ranked AS (
    SELECT
      user_id,
      full_name,
      avg_rating,
      total_reviews,
      completed_rides,
      RANK() OVER (ORDER BY avg_rating DESC, completed_rides DESC) as rank_position
    FROM rider_stats
  )
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'full_name', full_name,
      'rank_position', rank_position,
      'avg_rating', ROUND(avg_rating::numeric, 2),
      'total_reviews', total_reviews,
      'completed_rides', completed_rides
    ) ORDER BY rank_position
  ) INTO result
  FROM ranked;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
