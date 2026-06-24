-- Booking calendar add-on: availability configuration per company
-- One row per company per day of week (0=Sun, 6=Sat)

CREATE TABLE IF NOT EXISTS company_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 0,
  UNIQUE(company_id, day_of_week)
);

ALTER TABLE company_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_availability" ON company_availability FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "public_read_availability" ON company_availability FOR SELECT
  USING (true);
