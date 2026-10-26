import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"
import { PGlite } from "@electric-sql/pglite"

// Actual migration, ephemeral PostgreSQL, fake Auth/email only. No env or network.
const migrations = path.resolve("supabase/migrations")
const filename = process.argv[2] ?? fs.readdirSync(migrations).filter(name => name.endsWith("_company_members_server_only.sql")).sort().at(-1)
assert.ok(filename, "Containment migration must exist")
const migration = path.isAbsolute(filename) ? filename : path.join(migrations, filename)
const db = await PGlite.create()
const company = "11111111-1111-4111-a111-111111111111"
const other = "22222222-2222-4222-a222-222222222222"
const owner = "33333333-3333-4333-a333-333333333333"
const worker = "44444444-4444-4444-a444-444444444444"
const outsider = "55555555-5555-4555-a555-555555555555"
const invited = "66666666-6666-4666-a666-666666666666"
const member = "77777777-7777-4777-a777-777777777777"
let groups = 0, identity = { id: owner, email: "owner@fixture.test" }, sent = 0, generated = 0
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
async function snapshot() { return (await db.query("select to_jsonb(t) value from public.company_members t order by id")).rows.map(row => row.value) }
async function asRole(role, run) {
  await db.exec(`set role ${role}`)
  try { return await run() } finally { await db.exec("reset role") }
}

// Small service-role SQL adapter for executing actual server action/helper code.
function from(table) {
  assert.ok(["companies", "company_members"].includes(table), `Unexpected table: ${table}`)
  const values = [], filters = []
  let single = false, mutation, payload, maximum = ""
  const param = value => { values.push(value); return `$${values.length}` }
  const q = {
    select() { return q },
    eq(field, value) { assert.match(field, /^[a-z_]+$/); filters.push(`${field}=${param(value)}`); return q },
    is(field, value) { assert.match(field, /^[a-z_]+$/); assert.equal(value, null); filters.push(`${field} is null`); return q },
    or(expression) {
      filters.push(`(${expression.split(",").map(item => {
        const [field, operator, ...value] = item.split(".")
        assert.ok(["user_id", "email"].includes(field) && operator === "eq")
        return `${field}=${param(value.join("."))}`
      }).join(" or ")})`)
      return q
    },
    in(field, list) { assert.match(field, /^[a-z_]+$/); filters.push(`${field}=any(${param(list)}::uuid[])`); return q },
    order() { return q },
    limit(count) { assert.ok(Number.isInteger(count)); maximum = ` limit ${count}`; return q },
    maybeSingle() { single = true; return q },
    single() { single = true; return q },
    update(value) { mutation = "update"; payload = value; return q },
    insert(value) { mutation = "insert"; payload = value; return q },
    then(resolve, reject) {
      let sql
      const where = filters.length ? ` where ${filters.join(" and ")}` : ""
      if (!mutation) sql = `select * from public.${table}${where}${maximum}`
      else {
        const fields = Object.keys(payload)
        for (const field of fields) assert.match(field, /^[a-z_]+$/)
        if (mutation === "insert") sql = `insert into public.${table}(${fields.join(",")}) values(${fields.map(field => param(payload[field])).join(",")}) returning *`
        else sql = `update public.${table} set ${fields.map(field => `${field}=${param(payload[field])}`).join(",")}${where} returning *`
      }
      return db.query(sql, values).then(result => ({ data: single ? result.rows[0] ?? null : result.rows, error: null })).then(resolve, reject)
    },
  }
  return q
}
const admin = { from, auth: { admin: { generateLink: async () => {
  generated++
  return { data: { user: { id: invited }, properties: { action_link: "https://fixture.invalid/no-real-token" } }, error: null }
} } } }
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file.endsWith(".ts") ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }; cache.set(absolute, module)
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(output, { module, exports: module.exports, process: { env: {} }, console, require(id) {
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => admin }
    if (id === "@/lib/auth/getAuthUser") return { getAuthUser: async () => identity }
    if (id === "@/lib/emailLog") return { sendTrackedEmail: async () => { sent++; return { success: true } } }
    if (id === "@sentry/nextjs") return { setTag() {} }
    if (id === "next/headers") return { cookies: async () => ({ get: () => undefined,
      getAll: name => name === "found_selected_company_id" ? [{ value: company }] : [] }) }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency: ${id}`)
  } }, { filename: absolute })
  return module.exports
}

try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.companies(id uuid primary key, user_id uuid, email text, name text, slug text, retired_at timestamptz, created_at timestamptz default now());
    create table public.company_members(id uuid primary key default gen_random_uuid(),
      company_id uuid not null references public.companies(id) on delete cascade,
      user_id uuid references auth.users(id) on delete set null, email text not null,
      role text not null check(role='worker'), status text not null check(status in ('active','revoked')),
      invited_by uuid references auth.users(id), created_at timestamptz default now(), unique(company_id,email));
    alter table public.company_members enable row level security;
    create policy "service role full access" on public.company_members for all to public using(true) with check(true);
    grant usage on schema public to anon,authenticated,service_role;
    grant all privileges on public.company_members to public,anon,authenticated;
    grant select on public.companies to service_role;`)
  for (const id of [owner, worker, outsider, invited]) await db.query("insert into auth.users values($1)", [id])
  await db.query("insert into companies(id,user_id,email,name,slug) values($1,$2,'owner@fixture.test','Owner','fixture'),($3,$4,'other@fixture.test','Other','other')", [company, owner, other, outsider])
  await db.query("insert into company_members(id,company_id,user_id,email,role,status,invited_by) values($1,$2,$3,'worker@fixture.test','worker','active',$4)", [member, company, worker, owner])
  const before = await snapshot()
  await db.exec(fs.readFileSync(migration, "utf8"))
  await test("actual containment migration preserves all existing membership rows", async () => assert.deepEqual(await snapshot(), before))
  await test("RLS stays enabled and its only policy is service-role-only", async () => {
    assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.company_members'::regclass")).rows[0].relrowsecurity, true)
    const policies = (await db.query("select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='company_members'")).rows
    assert.equal(policies.length, 1)
    assert.equal(policies[0].policyname, "company_members_service_role_only")
    assert.deepEqual(policies[0].roles, ["service_role"])
    assert.equal(policies[0].cmd, "ALL")
    assert.equal(policies[0].qual, "true"); assert.equal(policies[0].with_check, "true")
  })
  for (const role of ["anon", "authenticated"]) {
    await test(`${role} has no SELECT/INSERT/UPDATE/DELETE table or column privileges`, async () => {
      for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) assert.equal((await db.query("select has_table_privilege($1,'public.company_members',$2) allowed", [role, privilege])).rows[0].allowed, false)
      for (const privilege of ["SELECT", "INSERT", "UPDATE"]) assert.equal((await db.query("select has_any_column_privilege($1,'public.company_members',$2) allowed", [role, privilege])).rows[0].allowed, false)
    })
    await test(`${role} cannot read, forge, rewrite or delete memberships (local fixtures only)`, async () => {
      await asRole(role, async () => {
        for (const query of ["select * from company_members", `insert into company_members(company_id,user_id,email,role,status) values('${company}','${outsider}','attacker@fixture.test','worker','active')`, "update company_members set status='revoked'", "delete from company_members"]) await assert.rejects(() => db.exec(query), /permission denied/)
      })
      assert.deepEqual(await snapshot(), before)
    })
  }
  await test("no residual PUBLIC table ACL grants exist", async () => {
    const grants = await db.query("select privilege_type from pg_class c cross join lateral aclexplode(c.relacl) a where c.oid='public.company_members'::regclass and a.grantee=0")
    assert.equal(grants.rows.length, 0)
  })
  const access = load("src/lib/dashboard/getCompany")
  const team = load("src/app/dashboard/(app)/team/actions")
  await asRole("service_role", async () => {
    await test("real server helpers retain owner access and existing worker company selection without owner escalation", async () => {
      const selected = await access.getCompany(worker, "worker@fixture.test")
      assert.equal(selected.id, company)
      assert.equal(await access.getCompanyRole(worker, "worker@fixture.test", selected), "worker")
      assert.equal(await access.requireOwnerAccess(worker, "worker@fixture.test", selected), false)
      assert.equal(await access.requireOwnerAccess(owner, "owner@fixture.test", selected), true)
      assert.equal(await access.getCompanyRole(outsider, "outsider@fixture.test", selected), null)
    })
    await test("real owner list, invite, revoke and reactivate actions still work through service-role", async () => {
      identity = { id: owner, email: "owner@fixture.test" }
      assert.equal((await team.getTeamMembers()).length, 1)
      assert.equal((await team.inviteWorker("new@fixture.test")).success, true)
      let row = (await db.query("select * from company_members where email='new@fixture.test'")).rows[0]
      assert.equal(row.role, "worker"); assert.equal(row.status, "active"); assert.equal(row.company_id, company)
      assert.equal((await team.revokeWorker(row.id)).success, true)
      assert.equal((await db.query("select status from company_members where id=$1", [row.id])).rows[0].status, "revoked")
      assert.equal((await team.inviteWorker("new@fixture.test")).success, true)
      row = (await db.query("select * from company_members where email='new@fixture.test'")).rows[0]
      assert.equal(row.status, "active"); assert.equal(generated, 2); assert.equal(sent, 2)
    })
    await test("real worker/unauthenticated callers cannot invite or revoke via server actions", async () => {
      const current = await snapshot(), sends = sent, links = generated
      identity = { id: worker, email: "worker@fixture.test" }
      assert.ok((await team.inviteWorker("blocked@fixture.test")).error)
      assert.ok((await team.revokeWorker(member)).error)
      assert.equal((await team.getTeamMembers()).length, 0)
      identity = null
      assert.ok((await team.inviteWorker("blocked@fixture.test")).error)
      assert.ok((await team.revokeWorker(member)).error)
      assert.deepEqual(await snapshot(), current); assert.equal(sent, sends); assert.equal(generated, links)
    })
    await test("service-role writes still cannot forge an owner membership", async () => {
      await assert.rejects(() => db.query("update company_members set role='owner' where id=$1", [member]), /check constraint/)
    })
  })
  await test("retired selected company fails closed for owner/worker without falling through to another owned company", async () => {
    await db.query("update companies set user_id=$1 where id=$2", [owner, other])
    await db.query("update companies set retired_at=now() where id=$1", [company])
    const beforeRequests = await snapshot()
    await asRole("service_role", async () => {
      assert.equal(await access.getCompany(owner, "owner@fixture.test"), null)
      assert.equal(await access.getCompany(worker, "worker@fixture.test"), null)
      const staleCompany = { id: company, user_id: owner, email: "owner@fixture.test" }
      assert.equal(await access.requireOwnerAccess(owner, "owner@fixture.test", staleCompany), false)
      assert.equal(await access.getCompanyRole(worker, "worker@fixture.test", staleCompany), null)
      const available = await access.getAllCompanies(owner, "owner@fixture.test")
      assert.deepEqual(Array.from(available, row => row.id), [other])
      identity = { id: owner, email: "owner@fixture.test" }
      const previousGenerated = generated, previousSent = sent
      assert.ok((await team.inviteWorker("stale@fixture.test")).error)
      assert.ok((await team.revokeWorker(member)).error)
      assert.equal(generated, previousGenerated); assert.equal(sent, previousSent)
    })
    assert.deepEqual(await snapshot(), beforeRequests)
  })
  console.log(`${groups} company-members security groups PASS; actual migration/server flows, ephemeral PostgreSQL and mocked Auth/email only. No remote requests or writes.`)
} finally { await db.close() }
