# Photo Pools — Found Co. Curated Stock Library
### All photos hand-picked from Unsplash (free tier only — no plus.unsplash.com)
### Rule: hero_image_url must be NULL for stock clients — shuffle drives everything
### Last updated: June 3, 2026

---

## How It Works

1. **Client real photos** (Phase 3) — set via ❤️ heart flag in the app → auto-syncs to site
2. **Curated stock pool** — hand-picked Unsplash URLs saved to `website_config.stock_images`
3. **Gradient fallback** — when stock_images is empty, brand color gradient is used

Photos shuffle on every page load. Hero, gallery strip, and all CTA sections all rotate from the same pool.

`hero_image_url` is ONLY set when a client manually picks their hero (Phase 3). Never set it for stock photos.

---

## Seeded Clients

### Fit & Delicious To-Go (`gotsmoothie`)
**Script:** `seed-gotsmoothie-photos.sql`
**Theme:** Smoothies, açaí bowls, healthy colorful food
**Count:** 10 photos

| Unsplash ID | Description |
|---|---|
| photo-1514995428455-447d4443fa7f | Strawberry juice beside fresh fruits on table |
| photo-1553530666-ba11a7da3888 | Two colorful fruit shakes/smoothies in glasses |
| photo-1610970881699-44a5587cabec | Green smoothie in glass with straw |
| photo-1570696516188-ade861b84a49 | Pink smoothie |
| photo-1684403620650-81dc661a69db | Açaí bowl with berries and banana |
| photo-1610441009633-b6ca9c6d4be2 | Strawberries and blueberries in white bowl |
| photo-1654084767590-a38c7f0f5bd3 | Green smoothie with orange slice and straw |
| photo-1654923064926-be7e64267a31 | Açaí/cereal bowl with milk and fruit |
| photo-1562166453-2783119c313a | Dessert bowl with nuts and blackberry |
| photo-1590288488147-f46142daf112 | Açaí bowl with strawberries and nuts |

---

### Blue Luna Events (`blueluna`)
**Script:** `seed-blueluna-photos.sql`
**Theme:** Balloons, event decor, colorful celebrations
**Count:** 8 photos

| Unsplash ID | Description |
|---|---|
| photo-1560128411-79892dd93bf8 | Multicolored balloon arrangement near white curtain |
| photo-1604668915840-580c30026e5f | Yellow and white balloons on table |
| photo-1741969494307-55394e3e4071 | Festive birthday celebration with balloons |
| photo-1777119914534-81d2ef0e93e9 | Colorful balloons floating against blue sky |
| photo-1626149136691-78e3977b3d69 | Assorted color balloons hung on string |
| photo-1636256373111-cddaa1470363 | Table with balloons and cake |
| photo-1597509679245-6fe7e1d7781c | Pink and red balloons near green trees |
| photo-1777120032245-75027e5912e2 | Colorful balloons on white tree sculpture |

---

### Barrio Builders (`barriobuilders`)
**Script:** `seed-barriobuilders-photos.sql`
**Theme:** Construction, remodeling, painting, home improvement
**Count:** 10 photos

| Unsplash ID | Description |
|---|---|
| photo-1674649207083-281c2517ab49 | Two men working on a house exterior |
| photo-1634586648651-f1fb9ec10d90 | Room with construction tools |
| photo-1517581177682-a085bb7ffb15 | Man climbing ladder inside room |
| photo-1505798577917-a65157d3320a | Man in front of miter saw |
| photo-1649083048770-82e8ffd80431 | Finished living room result |
| photo-1587582423116-ec07293f0395 | Construction worker in hard hat on building frame |
| photo-1589939705384-5185137a7f0f | Worker in orange vest with hard hat and power tool |
| photo-1768321916027-d0f69289227f | Interior construction with exposed beams and framing |
| photo-1717281234297-3def5ae3eee1 | Man painting wall with paint roller |
| photo-1574359411659-15573a27fd0c | Two men on ladder on wall |

---

## Adding a New Client

1. Browse unsplash.com — free photos only (images.unsplash.com, not plus.unsplash.com)
2. Pick 8–12 photos that match the business type
3. Fetch each photo page to get the CDN URL
4. Create `seed-[slug]-photos.sql` following the pattern above
5. Add entry to this file
6. Run SQL in Supabase
7. DO NOT set hero_image_url — leave null

## Pending Industries (need photo pools built)
- [ ] wellness (spa, massage)
- [ ] fitness (gym, workout)
- [ ] beauty (salon, nails)
- [ ] automotive (car repair)
- [ ] pet_services (grooming)
- [ ] cleaning (home cleaning)
- [ ] landscaping (outdoor, garden)
- [ ] retail (boutique, shop)
- [ ] food — generic (restaurant, cafe)
