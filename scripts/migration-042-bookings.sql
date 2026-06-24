-- Booking calendar add-on: confirmed bookings
-- Source of truth for slot conflict detection.
-- Each booking also creates a lead row (source = 'booking_calendar')
-- so it surfaces in the owner's Reservations view without any leads-page changes.

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  service_name text,
  notes text,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  confirmation_code text UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 6)),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX bookings_company_date_idx ON bookings(company_id, booking_date);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_bookings" ON bookings FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Public can insert (unauthenticated customer booking)
CREATE POLICY "anyone_can_book" ON bookings FOR INSERT
  WITH CHECK (true);
