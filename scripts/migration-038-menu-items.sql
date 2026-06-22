-- Migration 038: Add menu_items column to website_config
-- Stores structured menu data for food businesses
-- Schema: [{ category: string, items: [{ name, description, price, photo_url }] }]
ALTER TABLE website_config ADD COLUMN IF NOT EXISTS menu_items jsonb DEFAULT NULL;
