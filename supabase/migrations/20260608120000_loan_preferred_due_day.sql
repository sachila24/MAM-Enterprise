-- Recurring calendar day for fixed-term installment due-date generation (1–31).
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS preferred_due_day int;

ALTER TABLE loans
  ADD CONSTRAINT loans_preferred_due_day_range CHECK (
    preferred_due_day IS NULL
    OR (preferred_due_day >= 1 AND preferred_due_day <= 31)
  );

COMMENT ON COLUMN loans.preferred_due_day IS
  'Recurring payment day for fixed-term schedules; first due may differ when month is shorter.';
