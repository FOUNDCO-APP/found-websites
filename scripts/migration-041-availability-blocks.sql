-- Booking calendar add-on: blocked dates and time windows
-- Three block types:
--   Full day:   block_date is set
--   Date range: range_start + range_end are set
--   Time block: time_date + time_start + time_end are set (partial day)

CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  block_date date,
  range_start date,
  range_end date,
  time_date date,
  time_start time,
  time_end time,
  label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_blocks" ON availability_blocks FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "public_read_blocks" ON availability_blocks FOR SELECT
  USING (true);
