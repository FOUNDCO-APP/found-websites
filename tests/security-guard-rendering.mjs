import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
// Run from the repository root. Only fixture data is read; live clients and network access fail closed.
// Real stock selection, layouts, and route components run with data access and child widgets stubbed.
const require = createRequire(import.meta.url);
const cache = new Map();
let checks = 0;
const photo = 'https://fixture.invalid/screenshot.jpg';
const stock = ['https://fixture.invalid/office1.jpg', 'https://fixture.invalid/office2.jpg', 'https://fixture.invalid/office3.jpg'];
const company = { id: 'fixture', name: 'Intelligence Protection Security LLC', slug: 'fixture', industry_category: 'professional_services', sub_industry: 'Security Guard Services', primary_intent: 'contact', primary_color: '#147354', vibe: 'calm', phone: '5205550100', email: 'fixture@example.invalid', city: 'Tucson', state: 'AZ', address_visible: false, plan: 'found_pro', subscription_status: 'incomplete', website_config: { services: [{ name: 'Security Guard Services', description: 'Discuss your security needs.' }], about_preview: 'Security guard services in Tucson.', about_story: 'Contact us to discuss your site requirements.', about_text: 'Security guard services in Tucson.', testimonials: [], stock_images: stock, hero_images: [], hero_image_url: null, hero_video_url: null, social_links: {} } };
const tables = { company_photos: [], photo_albums: [], addon_subscriptions: [], company_locations: [] };
function query(table) { let predicates = [], single = false, max = Infinity; const q = new Proxy({}, { get(_, key) { if (key === 'then')
        return resolve => { let data = (tables[table] ?? []).filter(x => predicates.every(p => p(x))).slice(0, max); resolve({ data: single ? (data[0] ?? null) : data, error: null }); }; if (key === 'eq')
        return (k, v) => { predicates.push(x => x[k] === v); return q; }; if (key === 'in')
        return (k, vs) => { predicates.push(x => vs.includes(x[k])); return q; }; if (key === 'is')
        return (k, v) => { predicates.push(x => x[k] == v); return q; }; if (key === 'not')
        return (k, op, v) => { predicates.push(x => x[k] != v); return q; }; if (key === 'neq')
        return (k, v) => { predicates.push(x => x[k] !== v); return q; }; if (key === 'or')
        return () => { predicates.push(x => x.in_gallery || ['hero', 'about', 'cta', 'announcement'].includes(x.website_section)); return q; }; if (key === 'limit')
        return (v) => { max = v; return q; }; if (key === 'maybeSingle' || key === 'single')
        return () => { single = true; return q; }; return () => q; } }); return q; }
function photoWidget({ photos = [] }) { return React.createElement('div', {}, photos.map((p, i) => React.createElement('img', { key: i, src: typeof p === 'string' ? p : p.url }))); }
function load(file) {
    let abs = path.resolve(file);
    if (!path.extname(abs))
        abs += fs.existsSync(abs + '.ts') ? '.ts' : '.tsx';
    if (cache.has(abs))
        return cache.get(abs);
    const mod = { exports: {} };
    cache.set(abs, mod.exports);
    const source = ts.transpileModule(fs.readFileSync(abs, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: abs }).outputText;
    function req(id) { if (id === 'next/link')
        return { __esModule: true, default: ({ children, href, ...rest }) => React.createElement('a', { href, ...rest }, children) }; if (id === 'next/navigation')
        return { notFound() { throw Error('notFound'); } }; if (id === '@/lib/company')
        return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }; if (id === '@/lib/stripe/connect')
        return { getStripeConnectStatus: async () => ({ chargesEnabled: false }) }; if (id === '@/lib/supabase/admin')
        return { createAdminClient: () => ({ from: query }) }; if (id === '@supabase/supabase-js')
        return { createClient() { throw Error('Unexpected real data client'); } }; if (/GalleryLightbox|AlbumPhotoGrid/.test(id))
        return { __esModule: true, default: photoWidget }; if (id === '@/components/layouts/FindUsSection')
        return { __esModule: true, default: () => null }; if (id.startsWith('@/components/layouts/') && /Layout$/.test(id))
        return load('src/' + id.slice(2)); if (id.startsWith('@/components/') || id === './ContactForm' || id === './JobLeadCapture' || /OnlineOrderClient/.test(id))
        return { __esModule: true, default: ({ children }) => children ?? null }; if (id.startsWith('@/'))
        return load('src/' + id.slice(2)); if (id.startsWith('.'))
        return load(path.resolve(path.dirname(abs), id)); if (['react', 'react/jsx-runtime'].includes(id))
        return require(id); throw Error('Unexpected dependency ' + id); }
    vm.runInNewContext(source, { module: mod, exports: mod.exports, require: req, console, process: { env: {} }, URL, Date, fetch() { throw Error('Unexpected network read'); } }, { filename: abs });
    return mod.exports;
}
function check(ok, label) { assert.ok(ok, label); checks++; }
async function page(name) { return render(await load('src/app/[slug]/' + (name ? name + '/' : '') + 'page.tsx').default({ params: Promise.resolve({ slug: 'fixture' }) })); }
(async () => {
    const stockHelper = load('src/lib/stockImages');
    check((await stockHelper.getStockImages(company)).length === 0, 'guard stock bypasses stale cached generic photos');
    for (const layout of ['Impact', 'Editorial', 'Portrait', 'Cinematic', 'WellnessLuxe', 'WellnessCinematic']) {
        const Component = load('src/components/layouts/' + layout + 'Layout.tsx').default;
        const html = render(React.createElement(Component, { company, activeAddons: [], primaryCTA: { label: 'Contact Us', href: '/contact' }, secondaryCTA: null, imgs: [], gradient: '#111111', heroImage: null, heroVideo: null, uploadedImgs: [], sectionImages: { gallery: [] }, locations: [] }));
        check(html.includes('Security Guard Services'), layout + ' services');
        check(html.includes('About Us'), layout + ' about');
        check(html.includes('Tell us about your location, schedule, and coverage needs'), layout + ' CTA');
        check(!/About Me|How I Help|free consultation|Expert advice/i.test(html), layout + ' no generic wording');
        check(!html.includes('<img'), layout + ' no phantom images');
    }
    const Footer = load('src/components/Footer.tsx').default;
    check(render(React.createElement(Footer, { company })).includes('Security Guard Services'), 'footer guard default');
    const aboutCta = (await page('about')).match(/<p\b[^>]*>\s*Tell us about your location, schedule, and coverage needs[\s\S]*?<\/p>/)?.[0];
    check(Boolean(aboutCta), 'About renders guard CTA supporting paragraph');
    check(aboutCta?.replace(/<[^>]*>/g, '').trim() === 'Tell us about your location, schedule, and coverage needs.', 'About CTA has exactly one terminal period');
    for (const route of ['', 'about', 'services', 'gallery', 'contact', 'menu']) {
        const html = await page(route);
        check(!/About Me|How I Help|free consultation|Expert advice/i.test(html), (route || 'home') + ' no generic wording');
        check(!html.includes('fixture.invalid/office'), (route || 'home') + ' no stale generic stock');
        check(!html.includes('fixture.invalid/screenshot'), (route || 'home') + ' clean references keep screenshot absent');
    }
    company.sub_industry = 'Accountant';
    check((await page('gallery')).includes(stock[0]), 'non-guard cached gallery behavior unchanged');
    company.sub_industry = 'Security Guard Services';
    company.website_config.stock_images = [];
    for (const section of ['hero', 'cta']) {
        tables.company_photos = [{ id: 'shot', company_id: company.id, url: photo, for_website: true, website_section: section, in_gallery: false, album_id: null }];
        check((await page('')).includes(photo), 'cleared config alone still permits explicit ' + section + ' photo');
    }
    tables.company_photos = [{ id: 'shot', company_id: company.id, url: photo, for_website: true, website_section: null, in_gallery: true, album_id: null }];
    const galleryOnlyHome = await load('src/app/[slug]/page.tsx').default({ params: Promise.resolve({ slug: 'fixture' }) });
    check(galleryOnlyHome.props.heroImage === null, 'gallery-only photo cannot become homepage hero');
    check(galleryOnlyHome.props.sectionImages.gallery.includes(photo), 'gallery-only photo remains in homepage gallery');
    for (const section of ['about', 'services', 'contact']) {
        tables.company_photos = [{ id: 'shot', company_id: company.id, url: photo, for_website: true, website_section: section, in_gallery: false, album_id: null }];
        check((await page(section)).includes(photo), section + ' uses explicit section-photo assignment');
    }
    tables.company_photos = [{ id: 'shot', company_id: company.id, url: photo, for_website: false, website_section: null, in_gallery: true, album_id: null }];
    check((await page('gallery')).includes(photo), 'gallery in_gallery does not require for_website');
    company.subscription_status = 'active';
    tables.photo_albums = [{ id: 'album', company_id: company.id, name: 'Example', slug: 'example', album_type: 'gallery', show_on_website_gallery: true, cover_photo_id: 'shot' }];
    tables.company_photos = [{ id: 'shot', company_id: company.id, url: photo, for_website: false, website_section: null, in_gallery: false, album_id: 'album' }];
    check((await page('gallery')).includes(photo), 'published album membership can expose image without photo flags');
    tables.company_photos = [];
    tables.photo_albums = [];
    company.website_config.hero_video_url = 'https://fixture.invalid/screenshot.mp4';
    const videoProps = await load('src/app/[slug]/page.tsx').default({ params: Promise.resolve({ slug: 'fixture' }) });
    check(videoProps.props.heroVideo === company.website_config.hero_video_url, 'configured hero video independently survives still-image clearing');
    company.website_config.hero_video_url = null;
    for (const status of ['incomplete', 'active']) {
        company.subscription_status = status;
        const emptyGallery = await page('gallery');
        check(emptyGallery.includes('>Gallery</h2>'), status + ' guard empty gallery heading');
        check(emptyGallery.includes('No photos to display'), status + ' guard empty gallery state');
        check(emptyGallery.includes('Contact us to discuss your security needs.'), status + ' guard empty gallery contact copy');
        check(!/documenting|adding our latest|Check back soon|examples directly|speaks for itself/.test(emptyGallery), status + ' guard gallery makes no photo promises');
        company.sub_industry = 'Accountant';
        const otherGallery = await page('gallery');
        check(otherGallery.includes('Our work speaks for itself.'), status + ' non-guard gallery heading unchanged');
        check(otherGallery.includes(status === 'active' ? "adding our latest" : "documenting our latest projects"), status + ' non-guard empty gallery copy unchanged');
        company.sub_industry = 'Security Guard Services';
        for (const route of ['', 'about', 'services', 'gallery', 'contact', 'menu']) {
            const html = await page(route);
            check(!html.includes('fixture.invalid/'), status + ' ' + (route || 'home') + ' clean assignments no asset reintroduction');
        }
    }
    console.log('Guard runtime review passed: ' + checks + ' assertions. Real stock helper, 6 layouts, Footer, home/About/Services/Gallery/Contact/Menu routes. Data access and child widgets stubbed; no external reads/writes.');
    console.log('Confirmed cleanup prerequisites: config image/video refs, section-photo website flags, gallery flags, and published album membership.');
})().catch(e => { console.error(e); process.exitCode = 1; });
