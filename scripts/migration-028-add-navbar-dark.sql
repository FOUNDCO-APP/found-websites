-- Migration 028: add navbar_dark flag to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS navbar_dark boolean DEFAULT false;
