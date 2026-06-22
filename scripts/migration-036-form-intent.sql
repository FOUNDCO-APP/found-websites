-- migration-036: add form_intent to companies table
-- Run in Supabase SQL Editor

alter table public.companies
  add column if not exists form_intent text;

-- Default form_intent based on existing industry_category
update public.companies set form_intent = case
  when industry_category in ('food', 'restaurant', 'food_beverage') then 'reservation'
  when industry_category in ('wellness', 'beauty', 'salon', 'spa', 'fitness', 'music_performance', 'music', 'pet_services') then 'booking'
  when industry_category in ('healthcare') then 'appointment'
  when industry_category in ('home_services', 'cleaning', 'landscaping', 'automotive', 'auto', 'home_property', 'contractors', 'construction', 'plumbing', 'electrician') then 'estimate'
  when industry_category in ('retail', 'home_based_food', 'makers_crafts') then 'order'
  when industry_category in ('real_estate', 'events', 'event_planning', 'balloon_decor', 'creative_services', 'photography', 'education', 'professional_services', 'childcare', 'nonprofit') then 'inquiry'
  else 'lead'
end
where form_intent is null;
