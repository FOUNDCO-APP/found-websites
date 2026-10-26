import assert from "node:assert/strict"
import fs from "node:fs"
import { PGlite } from "@electric-sql/pglite"

// Ephemeral local PostgreSQL only. No environment, Supabase or network client.
const db = await PGlite.create()
const company = "11111111-1111-4111-a111-111111111111"
const other = "99999999-9999-4999-a999-999999999999"
const source = "22222222-2222-4222-a222-222222222222"
const legacy = "33333333-3333-4333-a333-333333333333"
const otherPhoto = "88888888-8888-4888-a888-888888888888"
const expected = "2026-10-25T01:00:00Z"
const url = "https://assets.example.test/original-flyer.jpg"
let groups = 0
async function state() {
  const result = {}
  for (const table of ["companies", "website_config", "company_photos"]) {
    result[table] = (await db.query(`select to_jsonb(t) as value from public.${table} t order by id`)).rows.map(row => row.value)
  }
  return result
}
async function reset() {
  await db.exec("reset role; truncate public.company_photos, public.website_config, public.companies cascade;")
  await db.query("insert into public.companies(id, name, stripe_customer_id) values ($1, 'Owner company', 'protected-customer'), ($2, 'Other company', 'other-customer')", [company, other])
  for (const id of [company, other]) await db.query(`insert into public.website_config(company_id, updated_at, announcement_enabled,
    announcement_style, announcement_title, announcement_body, announcement_cta_href, announcement_cta_label, services)
    values ($1, $2, true, 'image', 'Keep title', 'Keep body', 'tel:5551234567', 'Keep label', '[{"name":"Keep service"}]')`, [id, expected])
  await db.query(`insert into public.company_photos(id, company_id, url, storage_path, note, for_website, for_social, in_gallery, website_section, album_id)
    values ($1, $2, $3, 'owner/original.jpg', 'Keep source', true, true, true, 'about', '77777777-7777-4777-a777-777777777777'),
    ($4, $2, 'https://assets.example.test/legacy.png', 'owner/legacy.png', 'Keep old', true, false, true, 'announcement', null),
    ($5, $6, 'https://assets.example.test/other.png', 'other/photo.png', 'Other', true, true, true, 'announcement', null)`,
  [source, company, url, legacy, otherPhoto, other])
}
async function publish({ photo = source, image = url, timestamp = expected } = {}) {
  return (await db.query("select public.publish_homepage_highlight($1::uuid, $2::uuid, $3::text, $4::timestamptz) as result",
    [company, photo, image, timestamp])).rows[0].result
}
async function publishPhoto({ photo = source, image = url, timestamp = expected } = {}) {
  return (await db.query("select public.publish_announcement_photo($1::uuid, $2::uuid, $3::text, $4::timestamptz) as result",
    [company, photo, image, timestamp])).rows[0].result
}
async function test(name, fn) { await reset(); await fn(); groups++; console.log(`PASS ${name}`) }
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.companies(id uuid primary key, name text, stripe_customer_id text);
    create table public.website_config(
      id uuid primary key default gen_random_uuid(), company_id uuid not null unique references public.companies(id),
      updated_at timestamptz, announcement_enabled boolean, announcement_style text default 'default',
      announcement_title text, announcement_body text, announcement_cta_href text, announcement_cta_label text, services jsonb
    );
    create table public.company_photos(
      id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
      storage_path text not null, url text not null, note text, for_website boolean default false,
      for_social boolean default false, website_section text, in_gallery boolean default false, album_id uuid,
      created_at timestamptz default now()
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant select, insert, update on public.companies, public.website_config, public.company_photos to service_role;
  `)
  await db.exec(fs.readFileSync(new URL("../supabase/migrations/20261025233743_homepage_highlight_publish.sql", import.meta.url), "utf8"))
  await db.exec(fs.readFileSync(new URL("../supabase/migrations/20261025235018_homepage_highlight_publish_guards.sql", import.meta.url), "utf8"))
  await db.exec(fs.readFileSync(new URL("../supabase/migrations/20261026005748_announcement_photo_destination.sql", import.meta.url), "utf8"))
  await test("actual migration creates an invoker-only RPC executable only by service_role", async () => {
    const proc = (await db.query(`select prosecdef, proconfig from pg_proc
      where oid = 'public.publish_homepage_highlight(uuid,uuid,text,timestamptz)'::regprocedure`)).rows[0]
    assert.equal(proc.prosecdef, false)
    assert.ok(proc.proconfig.includes('search_path=""'))
    for (const [role, allowed] of [["anon", false], ["authenticated", false], ["service_role", true]]) {
      const result = await db.query("select has_function_privilege($1, 'public.publish_homepage_highlight(uuid,uuid,text,timestamptz)', 'execute') as allowed", [role])
      assert.equal(result.rows[0].allowed, allowed)
    }
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`)
      try { await assert.rejects(() => publish(), /permission denied/) } finally { await db.exec("reset role") }
    }
  })
  await test("service-role publish clones atomically and preserves Gallery, albums, source, copy and other tenant", async () => {
    const before = await state()
    await db.exec("set role service_role")
    const result = await publish()
    await db.exec("reset role")
    const after = await state()
    assert.equal(result.photo.website_section, "announcement")
    assert.equal(result.photo.company_id, company)
    assert.equal(result.photo.in_gallery, false)
    assert.equal(result.photo.for_website, true)
    assert.equal(result.photo.for_social, false)
    assert.equal(result.photo.album_id, null)
    assert.notEqual(result.photo.id, source)
    assert.deepEqual(result.clearedPhotoIds, [legacy])
    assert.deepEqual(after.companies, before.companies)
    assert.deepEqual(after.company_photos.find(row => row.id === source), before.company_photos.find(row => row.id === source))
    assert.deepEqual(after.company_photos.find(row => row.id === legacy), { ...before.company_photos.find(row => row.id === legacy), website_section: null })
    assert.deepEqual(after.company_photos.find(row => row.id === otherPhoto), before.company_photos.find(row => row.id === otherPhoto))
    const previous = before.website_config.find(row => row.company_id === company)
    const current = after.website_config.find(row => row.company_id === company)
    assert.notEqual(current.updated_at, previous.updated_at)
    assert.deepEqual(current, { ...previous, announcement_enabled: true, announcement_style: "artwork", updated_at: current.updated_at })
    assert.deepEqual(after.website_config.find(row => row.company_id === other), before.website_config.find(row => row.company_id === other))
  })
  await test("stale timestamp rejects before changing config or creating any clone", async () => {
    const before = await state()
    await assert.rejects(() => publish({ timestamp: "2026-10-24T01:00:00Z" }), /Highlight changed/)
    assert.deepEqual(await state(), before)
  })
  await test("two requests with the same expected timestamp commit exactly once", async () => {
    await publish()
    const winner = await state()
    await assert.rejects(() => publish(), /Highlight changed/)
    assert.deepEqual(await state(), winner)
    assert.equal(winner.company_photos.filter(row => row.company_id === company && row.website_section === "announcement").length, 1)
  })
  await test("cross-company photo and changed expected URL reject without mutation", async () => {
    const before = await state()
    await assert.rejects(() => publish({ photo: otherPhoto, image: "https://assets.example.test/other.png" }), /no rows/)
    await assert.rejects(() => publish({ image: "https://assets.example.test/stale.jpg" }), /Selected photo changed/)
    assert.deepEqual(await state(), before)
  })
  await test("config failure after clone and slot clearing rolls back every preceding statement", async () => {
    await db.exec("alter table public.website_config add constraint fixture_reject_artwork check (announcement_style <> 'artwork')")
    const before = await state()
    try {
      await assert.rejects(() => publish(), /fixture_reject_artwork/)
      assert.deepEqual(await state(), before)
    } finally { await db.exec("alter table public.website_config drop constraint fixture_reject_artwork") }
  })
  await db.exec(`create function public.fixture_suppress_highlight_write() returns trigger
    language plpgsql as $$ begin return null; end $$;`)
  for (const [name, table, operation, condition, message] of [
    ["silently suppressed config update", "website_config", "update", "", /Highlight configuration was not updated/],
    ["silently suppressed placement insert", "company_photos", "insert", "when (new.website_section = 'announcement')", /Highlight placement was not created/],
    ["silently suppressed legacy placement clearing", "company_photos", "update", "when (old.website_section = 'announcement' and new.website_section is null)", /Previous highlight placement could not be cleared/],
  ]) {
    await test(`${name} raises and rolls back the entire transaction`, async () => {
      await db.exec(`create trigger fixture_suppress before ${operation} on public.${table}
        for each row ${condition} execute function public.fixture_suppress_highlight_write()`)
      const before = await state()
      try {
        await assert.rejects(() => publish(), message)
        assert.deepEqual(await state(), before)
      } finally { await db.exec(`drop trigger fixture_suppress on public.${table}`) }
    })
  }
  await test("an existing announcement source retains its Gallery membership when replaced by a clone", async () => {
    const before = (await state()).company_photos.find(row => row.id === legacy)
    await publish({ photo: legacy, image: before.url })
    assert.deepEqual((await state()).company_photos.find(row => row.id === legacy), { ...before, website_section: null })
  })
  await test("null expected timestamps work once and are changed to prevent repeated null-CAS publishes", async () => {
    await db.query("update public.website_config set updated_at = null where company_id = $1", [company])
    await publish({ timestamp: null })
    const winner = await state()
    await assert.rejects(() => publish({ timestamp: null }), /Highlight changed/)
    assert.deepEqual(await state(), winner)
  })
  await test("Photo wrapper retains invoker security and excludes anon/authenticated execution", async () => {
    const proc = (await db.query("select prosecdef, proconfig from pg_proc where oid = 'public.publish_announcement_photo(uuid,uuid,text,timestamptz)'::regprocedure")).rows[0]
    assert.equal(proc.prosecdef, false)
    assert.ok(proc.proconfig.includes('search_path=""'))
    for (const [role, allowed] of [["anon", false], ["authenticated", false], ["service_role", true]]) {
      assert.equal((await db.query("select has_function_privilege($1, 'public.publish_announcement_photo(uuid,uuid,text,timestamptz)', 'execute') as allowed", [role])).rows[0].allowed, allowed)
      if (!allowed) {
        await db.exec(`set role ${role}`)
        try { await assert.rejects(() => publishPhoto(), /permission denied/) } finally { await db.exec("reset role") }
      }
    }
  })
  await test("Photo wrapper atomically retains every text style, copy, Gallery, source and other company", async () => {
    for (const style of [null, "default", "light", "dark", "accent", "image", "artwork"]) {
      await reset()
      await db.query("update public.website_config set announcement_style = $1 where company_id = $2", [style, company])
      const before = await state()
      await db.exec("set role service_role")
      const result = await publishPhoto()
      await db.exec("reset role")
      const after = await state()
      const config = after.website_config.find(row => row.company_id === company)
      const original = before.website_config.find(row => row.company_id === company)
      const chosenStyle = ["artwork", "image"].includes(style) ? "dark" : style
      assert.equal(result.style, chosenStyle)
      assert.deepEqual(config, { ...original, announcement_style: chosenStyle, announcement_cta_href: "#announcement-photo", updated_at: config.updated_at })
      assert.deepEqual(after.companies, before.companies)
      assert.deepEqual(after.company_photos.find(row => row.id === source), before.company_photos.find(row => row.id === source))
      assert.deepEqual(after.company_photos.find(row => row.id === legacy), { ...before.company_photos.find(row => row.id === legacy), website_section: null })
      assert.equal(result.photo.in_gallery, false)
      assert.equal(result.photo.website_section, "announcement")
      assert.deepEqual(after.company_photos.find(row => row.id === otherPhoto), before.company_photos.find(row => row.id === otherPhoto))
      assert.deepEqual(after.website_config.find(row => row.company_id === other), before.website_config.find(row => row.company_id === other))
    }
  })
  await test("Photo wrapper rejects stale timestamps, changed URLs and other-company sources without mutations", async () => {
    const before = await state()
    await assert.rejects(() => publishPhoto({ timestamp: null }), /Announcement changed/)
    await assert.rejects(() => publishPhoto({ image: "https://assets.example.test/changed.jpg" }), /Selected photo changed/)
    await assert.rejects(() => publishPhoto({ photo: otherPhoto }), /no rows/)
    assert.deepEqual(await state(), before)
    await publishPhoto()
    const winner = await state()
    await assert.rejects(() => publishPhoto(), /Announcement changed/)
    assert.deepEqual(await state(), winner)
  })
  await test("suppressed final destination update rolls back the nested publication and clearing", async () => {
    await db.exec(`create trigger fixture_suppress before update on public.website_config for each row
      when (new.announcement_cta_href = '#announcement-photo') execute function public.fixture_suppress_highlight_write()`)
    const before = await state()
    try {
      await assert.rejects(() => publishPhoto(), /Announcement destination was not updated/)
      assert.deepEqual(await state(), before)
    } finally { await db.exec("drop trigger fixture_suppress on public.website_config") }
  })
  await test("rejected final destination constraint rolls back all nested writes", async () => {
    await db.exec("alter table public.website_config add constraint fixture_reject_destination check (announcement_cta_href <> '#announcement-photo')")
    const before = await state()
    try {
      await assert.rejects(() => publishPhoto(), /fixture_reject_destination/)
      assert.deepEqual(await state(), before)
    } finally { await db.exec("alter table public.website_config drop constraint fixture_reject_destination") }
  })
  await test("normal updated_at trigger remains compatible with Photo publication", async () => {
    await db.exec(`create function public.fixture_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
      create trigger fixture_timestamp before update on public.website_config for each row execute function public.fixture_updated_at()`)
    try {
      const result = await publishPhoto()
      assert.equal(result.style, "dark")
      const config = (await state()).website_config.find(row => row.company_id === company)
      assert.equal(config.announcement_cta_href, "#announcement-photo")
      assert.notEqual(config.updated_at, expected)
    } finally { await db.exec("drop trigger fixture_timestamp on public.website_config") }
  })
  for (const [field, replacement] of [["announcement_cta_href", "'/contact'"], ["announcement_style", "'light'"], ["announcement_enabled", "false"]]) {
    await test(`silently rewritten ${field} rejects and rolls back nested writes`, async () => {
      await db.exec(`create or replace function public.fixture_rewrite_destination() returns trigger language plpgsql as $$
        begin new.${field} := ${replacement}; return new; end $$;
        create trigger fixture_rewrite before update on public.website_config for each row
        when (new.announcement_cta_href = '#announcement-photo') execute function public.fixture_rewrite_destination()`)
      const before = await state()
      try {
        await assert.rejects(() => publishPhoto(), /Announcement destination state was not preserved/)
        assert.deepEqual(await state(), before)
      } finally { await db.exec("drop trigger fixture_rewrite on public.website_config") }
    })
  }
  console.log(`${groups} actual PostgreSQL highlight publication groups passed; ephemeral local database only. Multi-session lock scheduling is not simulated.`)
} finally { await db.close() }
