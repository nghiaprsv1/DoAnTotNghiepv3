BEGIN;
-- Detach orphaned guides: clear trips.guide_id + remove the GUIDE TripMember row
-- (and fix member_count) for trips whose ONLY link to that guide is via a
-- cancelled/rejected booking — i.e. no live (pending/confirmed) and no completed
-- booking exists. Completed bookings legitimately keep the guide attached.
WITH orphan AS (
  SELECT t.id AS trip_id, gp.user_id AS guide_user, gp.id AS guide_profile
  FROM trips t
  JOIN guide_profiles gp ON gp.user_id = t.guide_id
  WHERE t.guide_id IS NOT NULL
    AND t.status <> 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM guide_bookings b
      WHERE b.trip_id = t.id AND b.guide_id = gp.id
        AND b.status IN ('pending_acceptance','pending_payment','confirmed','completed')
    )
)
-- Drop the GUIDE member row and decrement member_count for each orphan.
, del AS (
  DELETE FROM trip_members tm
  USING orphan o
  WHERE tm.trip_id = o.trip_id AND tm.user_id = o.guide_user AND tm.role = 'guide'
  RETURNING tm.trip_id
)
UPDATE trips t
SET member_count = GREATEST(member_count - 1, 1)
WHERE t.id IN (SELECT trip_id FROM del);

-- Finally clear guide_id on the orphaned trips.
UPDATE trips t
SET guide_id = NULL
FROM guide_profiles gp
WHERE t.guide_id = gp.user_id
  AND t.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM guide_bookings b
    WHERE b.trip_id = t.id AND b.guide_id = gp.id
      AND b.status IN ('pending_acceptance','pending_payment','confirmed','completed')
  );
COMMIT;
