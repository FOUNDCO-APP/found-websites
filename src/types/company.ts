export type ServiceItem = {
  name: string
  description: string
}

export type Testimonial = {
  name: string
  role: string
  quote: string
}

export type MenuItem = {
  name: string
  description: string
  price: string | null
}

export type MenuCategory = {
  category: string
  items: MenuItem[]
}

export type WebsiteConfig = {
  id: string
  hero_title: string | null
  hero_subtitle: string | null
  hero_video_url: string | null
  hero_image_url: string | null
  hero_images: string[] | null
  stock_images: string[]
  about_text: string | null
  tagline: string | null
  cta_headline: string | null
  services: ServiceItem[]
  menu_items: MenuCategory[] | null
  testimonials: Testimonial[]
  service_areas: string[]
  social_links: Record<string, string>
  custom_domain: string | null
  published: boolean
  copy_generated: boolean
}

export type Company = {
  id: string
  name: string
  slug: string
  industry_category: string
  primary_intent: string
  secondary_intent: string | null
  sub_industry: string | null
  vibe: string
  phone: string | null
  email: string | null
  phone_visible: boolean | null
  email_visible: boolean | null
  lead_phone: string | null
  lead_email: string | null
  city: string | null
  state: string | null
  logo_url: string | null
  logo_white_url: string | null
  navbar_dark: boolean | null
  stripe_customer_id: string | null
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  pending_setup_intent_secret: string | null
  primary_color: string
  accent_color_1: string
  accent_color_2: string
  photo_keywords: string | null
  website_config: WebsiteConfig | null
}

export type Intent = 'call' | 'visit' | 'book' | 'quote' | 'shop' | 'contact'

export const intentLabel: Record<string, string> = {
  call: 'Call Us',
  visit: 'Visit Us',
  book: 'Book Now',
  quote: 'Get a Free Estimate',
  shop: 'Shop Now',
  contact: 'Contact Us',
}

export const intentHref: Record<string, string> = {
  call: 'tel',
  visit: '/contact',
  book: '/contact',
  quote: '/estimate',
  shop: '/shop',
  contact: '/contact',
}
