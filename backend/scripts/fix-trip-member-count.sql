BEGIN;
-- Sync trips.member_count to the real number of rows in trip_members.
UPDATE trips t
SET member_count = COALESCE(m.cnt, 0)
FROM (SELECT trip_id, count(*) AS cnt FROM trip_members GROUP BY trip_id) m
WHERE m.trip_id = t.id
  AND t.member_count <> m.cnt;

-- Trips with zero member rows: force member_count = 0 too.
UPDATE trips t
SET member_count = 0
WHERE NOT EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = t.id)
  AND t.member_count <> 0;
COMMIT;
