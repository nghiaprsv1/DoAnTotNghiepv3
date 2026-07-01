BEGIN;
-- (1) end_date < start_date: recompute end_date from duration_days (start as anchor)
UPDATE trips
SET end_date = start_date + (GREATEST(duration_days, 1) - 1)
WHERE end_date < start_date;

-- (2) Sync duration_days = real inclusive day span for any mismatched trip
UPDATE trips
SET duration_days = (end_date - start_date + 1)
WHERE (end_date - start_date + 1) <> duration_days;
COMMIT;
