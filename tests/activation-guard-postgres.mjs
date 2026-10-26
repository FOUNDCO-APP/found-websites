import assert from "node:assert/strict"
import fs from "node:fs"
import { PGlite } from "@electric-sql/pglite"

// Actual migration in ephemeral PostgreSQL. Synthetic data; no env or network clients.
const db = await PGlite.create()
const company = "11111111-1111-4111-a111-111111111111"
const other = "22222222-2222-4222-a222-222222222222"
const token = "33333333-3333-4333-a333-333333333333"
const nextToken = "44444444-4444-4444-a444-444444444444"
const missing = "99999999-9999-4999-a999-999999999999"
let groups = 0
async function service(fn) {
  await db.exec("set role service_role")
  try { return await fn() } finally { await db.exec("reset role") }
}
async function claim({ id = company, customer = "cus_fixture", intent = "seti_fixture", live = true, lease = token } = {}) {
  return service(async () => (await db.query(
    "select public.claim_activation_attempt($1::uuid,$2,$3,$4,$5::uuid) as result",
    [id, customer, intent, live, lease])).rows[0].result)
}
async function note(attempt, { id = company, customer = "cus_fixture", live = true, subscription = "sub_fixture" } = {}) {
  return service(async () => (await db.query(
    "select public.note_activation_subscription($1::uuid,$2::uuid,$3,$4,$5) as result",
    [attempt, id, customer, live, subscription])).rows[0].result)
}
async function complete(attempt, { lease = token, subscription = "sub_fixture", update = null } = {}) {
  return service(async () => (await db.query(
    "select public.complete_activation_attempt($1::uuid,$2::uuid,$3,$4::jsonb) as result",
    [attempt, lease, subscription, update === null ? null : JSON.stringify(update)])).rows[0].result)
}
async function saveSetup({ id = company, customer = "cus_fixture", pending = "seti_fixture_secret_local", status = "incomplete", update = { stripe_customer_id: "cus_fixture", pending_setup_intent_secret: "seti_next_secret_local", plan: "found_pro" } } = {}) {
  // Caller sets the role, allowing queued competing requests on one connection.
  return (await db.query("select public.save_activation_setup($1::uuid,$2,$3,$4,$5::jsonb) as result",
    [id, customer, pending, status, JSON.stringify(update)])).rows[0].result
}
async function state() {
  return {
    companies: (await db.query("select * from public.companies order by id")).rows,
    attempts: (await db.query("select * from public.activation_attempts order by id")).rows,
  }
}
async function expire(id) {
  await db.query("update public.activation_attempts set lease_until = now() - interval '1 second' where id = $1", [id])
}
async function reset() {
  await db.exec("reset role; truncate public.activation_attempts, public.companies cascade")
  await db.query(`insert into public.companies(id,stripe_customer_id,pending_setup_intent_secret,subscription_status,plan,is_founding_member)
    values ($1,'cus_fixture','seti_fixture_secret_local','incomplete','found_pro',false),
    ($2,'cus_other','seti_other_secret_local','active','found',true)`, [company, other])
}
async function test(name, fn) {
  await reset()
  await fn()
  groups++
  console.log(`PASS ${name}`)
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.companies (
      id uuid primary key, retired_at timestamptz, stripe_customer_id text,
      pending_setup_intent_secret text, subscription_status text, plan text,
      is_founding_member boolean, trial_ends_at timestamptz,
      applied_promotion_code_id text, applied_promotion_code text,
      applied_coupon_id text, applied_discount_label text
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant select, update on public.companies to service_role;
  `)
  await db.exec(fs.readFileSync(new URL("../supabase/migrations/20261026180535_activation_confirmation_guard.sql", import.meta.url), "utf8"))
  const signatures = [
    "public.claim_activation_attempt(uuid,text,text,boolean,uuid)",
    "public.note_activation_subscription(uuid,uuid,text,boolean,text)",
    "public.save_activation_setup(uuid,text,text,text,jsonb)",
  ]
  const hasCompletion = (await db.query("select to_regprocedure('public.complete_activation_attempt(uuid,uuid,text,jsonb)') is not null as available")).rows[0].available
  if (hasCompletion) signatures.push("public.complete_activation_attempt(uuid,uuid,text,jsonb)")

  await test("table and invoker RPC privileges are service-only; anon/authenticated execution denied", async () => {
    assert.equal((await db.query("select relrowsecurity from pg_class where oid = 'public.activation_attempts'::regclass")).rows[0].relrowsecurity, true)
    for (const [role, allowed] of [["anon", false], ["authenticated", false], ["service_role", true]]) {
      for (const permission of ["SELECT", "INSERT", "UPDATE"]) {
        assert.equal((await db.query("select has_table_privilege($1,'public.activation_attempts',$2) as allowed", [role, permission])).rows[0].allowed, allowed)
      }
      for (const signature of signatures) {
        const proc = (await db.query("select prosecdef,proconfig,has_function_privilege($1,oid,'EXECUTE') as allowed from pg_proc where oid=$2::regprocedure", [role, signature])).rows[0]
        assert.equal(proc.prosecdef, false)
        assert.ok(proc.proconfig.includes('search_path=""'))
        assert.equal(proc.allowed, allowed)
      }
      if (!allowed) {
        await db.exec(`set role ${role}`)
        try {
          await assert.rejects(() => db.query("select * from public.activation_attempts"), /permission denied/)
          await assert.rejects(() => db.query("select public.claim_activation_attempt($1::uuid,'cus_fixture','seti_fixture',true,$2::uuid)", [company, token]), /permission denied/)
          await assert.rejects(() => db.query("select public.note_activation_subscription($1::uuid,$2::uuid,'cus_fixture',true,'sub_fixture')", [missing, company]), /permission denied/)
          if (hasCompletion) await assert.rejects(() => db.query("select public.complete_activation_attempt($1::uuid,$2::uuid,'sub_fixture',null)", [missing, token]), /permission denied/)
          await assert.rejects(() => saveSetup(), /permission denied/)
        } finally { await db.exec("reset role") }
      }
    }
  })
  await test("RLS independently hides rows and rejects writes even if table grants broaden", async () => {
    await claim()
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`grant select, insert, update on public.activation_attempts to ${role}; set role ${role}`)
      try {
        assert.equal((await db.query("select * from public.activation_attempts")).rows.length, 0)
        assert.equal((await db.query("update public.activation_attempts set customer_id='changed' returning id")).rows.length, 0)
        await assert.rejects(() => db.query("insert into public.activation_attempts(company_id,customer_id,setup_intent_id,livemode) values ($1,'cus_fake','seti_fake',true)", [other]), /row-level security/)
      } finally {
        await db.exec(`reset role; revoke all on public.activation_attempts from ${role}`)
      }
    }
    assert.equal((await state()).attempts[0].customer_id, "cus_fixture")
  })
  await test("same intent lease is busy; expired lease resumes stable attempt and request parameters", async () => {
    const first = await claim()
    assert.equal(first.state, "pending")
    assert.deepEqual(first.expected_company, { plan: "found_pro", subscription_status: "incomplete" })
    assert.equal(first.lease_token, token)
    assert.ok(new Date(first.lease_until) > new Date())
    await db.query("update public.activation_attempts set request_params=$1::jsonb,first_dispatched_at=now() where id=$2", [JSON.stringify({ items: [{ price: "price_preserved" }], trial_end: 1800000000 }), first.id])
    const before = await state()
    assert.equal(await claim({ lease: nextToken }), null)
    assert.deepEqual(await state(), before)
    await expire(first.id)
    const resumed = await claim({ lease: nextToken })
    assert.equal(resumed.id, first.id)
    assert.equal(resumed.lease_token, nextToken)
    assert.deepEqual(resumed.request_params, before.attempts[0].request_params)
    assert.equal(new Date(resumed.first_dispatched_at).toISOString(), before.attempts[0].first_dispatched_at.toISOString())
    assert.equal((await state()).attempts.length, 1)
  })
  await test("different intent stays blocked while any same-mode company attempt is pending, even expired", async () => {
    const first = await claim()
    await db.query("update public.companies set pending_setup_intent_secret='seti_next_secret_local' where id=$1", [company])
    assert.equal(await claim({ intent: "seti_next" }), null)
    await expire(first.id)
    const before = await state()
    assert.equal(await claim({ intent: "seti_next" }), null)
    assert.deepEqual(await state(), before)
  })
  await test("live/test leases are separate and another company can claim independently", async () => {
    const live = await claim()
    const sandbox = await claim({ live: false, lease: nextToken })
    assert.notEqual(live.id, sandbox.id)
    assert.equal(live.livemode, true)
    assert.equal(sandbox.livemode, false)
    assert.equal(await claim({ live: false }), null)
    const second = await claim({ id: other, customer: "cus_other", intent: "seti_other" })
    assert.equal(second.company_id, other)
    assert.equal((await state()).attempts.length, 3)
  })
  await test("missing/retired company, foreign customer and incorrect current intent deny without writes", async () => {
    const before = await state()
    await assert.rejects(() => claim({ id: missing }), /company mapping changed/)
    await assert.rejects(() => claim({ customer: "cus_other" }), /company mapping changed/)
    await assert.rejects(() => claim({ intent: "seti_incorrect" }), /no longer current/)
    assert.deepEqual(await state(), before)
    await db.query("update public.companies set retired_at=now() where id=$1", [company])
    const retired = await state()
    await assert.rejects(() => claim(), /company mapping changed/)
    assert.deepEqual(await state(), retired)
  })
  await test("null claim token/mode/intent, empty intent and null mapping reject without writes", async () => {
    const before = await state()
    for (const overrides of [{ lease: null }, { live: null }, { intent: null }, { intent: "" }]) {
      await assert.rejects(() => claim(overrides), /Invalid activation claim/)
      assert.deepEqual(await state(), before)
    }
    for (const overrides of [{ id: null }, { customer: null }]) {
      await assert.rejects(() => claim(overrides), /company mapping changed/)
      assert.deepEqual(await state(), before)
    }
    const first = await claim()
    const pending = await state()
    await assert.rejects(() => claim({ lease: null }), /Invalid activation claim/)
    assert.deepEqual(await state(), pending)
    assert.equal(pending.attempts[0].id, first.id)
  })
  await test("existing intent cannot be claimed across company/customer mappings", async () => {
    const first = await claim()
    await expire(first.id)
    const before = await state()
    await assert.rejects(() => claim({ id: other, customer: "cus_other" }), /attempt mapping mismatch/)
    await db.query("update public.companies set stripe_customer_id='cus_relinked' where id=$1", [company])
    const relinked = await state()
    await assert.rejects(() => claim({ customer: "cus_relinked" }), /attempt mapping mismatch/)
    assert.deepEqual(await state(), relinked)
    assert.deepEqual(relinked.attempts, before.attempts)
  })
  await test("webhook note is idempotent, cannot replace subscription or cross mappings, and does not complete", async () => {
    const first = await claim()
    await expire(first.id)
    assert.equal(await note(first.id), true)
    assert.equal(await note(first.id), true)
    const before = await state()
    for (const overrides of [{ id: other }, { customer: "cus_other" }, { live: false }, { subscription: "sub_different" }]) {
      assert.equal(await note(first.id, overrides), false)
      assert.deepEqual(await state(), before)
    }
    assert.equal(await note(missing), false)
    assert.equal(before.attempts[0].state, "pending")
    assert.equal(before.attempts[0].stripe_subscription_id, "sub_fixture")
  })
  if (hasCompletion) {
    await test("completion rejects null token/subscription/attempt and cleared lease without mutation", async () => {
      const first = await claim()
      await note(first.id)
      const before = await state()
      for (const overrides of [{ lease: null }, { subscription: null }]) {
        await assert.rejects(() => complete(first.id, overrides), /mapping or lease changed/)
        assert.deepEqual(await state(), before)
      }
      await assert.rejects(() => complete(null), /Missing activation attempt/)
      await db.query("update public.activation_attempts set lease_until=null where id=$1", [first.id])
      const cleared = await state()
      await assert.rejects(() => complete(first.id), /mapping or lease changed/)
      assert.deepEqual(await state(), cleared)
    })
    await test("malformed completion JSON and missing/null/invalid plan or status reject atomically", async () => {
      const first = await claim()
      await note(first.id)
      const before = await state()
      const malformed = [null, {}, [], "invalid", 17, true,
        { plan: "found_pro" }, { subscription_status: "active" },
        { plan: null, subscription_status: "active" }, { plan: "found_pro", subscription_status: null },
        { plan: "", subscription_status: "active" }, { plan: "found_pro", subscription_status: "" },
        { plan: ["found_pro"], subscription_status: "active" }, { plan: "found_pro", subscription_status: {} },
        { plan: "found_pro", subscription_status: "active", is_founding_member: "not_boolean" },
        { plan: "found_pro", subscription_status: "active", trial_ends_at: "not_a_date" }]
      for (const update of malformed) {
        // JSON null differs from intentional SQL NULL (recover existing result).
        await assert.rejects(() => service(() => db.query(
          "select public.complete_activation_attempt($1::uuid,$2::uuid,$3,$4::jsonb)",
          [first.id, token, "sub_fixture", JSON.stringify(update)])), /Invalid activation result|Company plan changed|invalid input syntax/)
        assert.deepEqual(await state(), before)
      }
    })
    await test("completion retains complete promo audit in both optional columns and protected attempt", async () => {
      const first = await claim()
      await note(first.id)
      const update = { subscription_status: "active", plan: "found_pro", applied_promotion_code_id: "promo_fixture", applied_promotion_code: "LOCAL", applied_coupon_id: "coupon_fixture", applied_discount_label: "Fixture discount" }
      assert.equal(await complete(first.id, { update }), true)
      const after = await state()
      assert.deepEqual(after.attempts[0].company_result, update)
      const owner = after.companies.find(c => c.id === company)
      for (const field of Object.keys(update)) assert.equal(owner[field], update[field])
      await claim({ lease: nextToken })
      await complete(first.id, { lease: nextToken })
      assert.deepEqual((await state()).attempts[0].company_result, update)
    })
    await test("legacy schema without optional promo columns still retains all result audit", async () => {
      const fields = ["applied_promotion_code_id", "applied_promotion_code", "applied_coupon_id", "applied_discount_label"]
      await db.exec(`alter table public.companies ${fields.map(f => `drop column ${f}`).join(", ")}`)
      try {
        const first = await claim()
        await note(first.id)
        const update = { subscription_status: "active", plan: "found_pro", applied_promotion_code_id: "promo_local", applied_promotion_code: "LOCAL", applied_coupon_id: null, applied_discount_label: "15-day headstart" }
        assert.equal(await complete(first.id, { update }), true)
        assert.deepEqual((await state()).attempts[0].company_result, update)
      } finally { await db.exec(`alter table public.companies ${fields.map(f => `add column ${f} text`).join(", ")}`) }
    })
    await test("changed company plan rejects completion without overwriting new plan or audit", async () => {
      const first = await claim()
      await note(first.id)
      await db.query("update public.companies set plan='found_business' where id=$1", [company])
      const before = await state()
      await assert.rejects(() => complete(first.id, { update: { subscription_status: "active", plan: "found_pro" } }), /Company plan changed/)
      assert.deepEqual(await state(), before)
    })
    await test("company plan already at target permits completion after independent projection", async () => {
      const first = await claim()
      await note(first.id)
      await db.query("update public.companies set plan='found_business' where id=$1", [company])
      assert.equal(await complete(first.id, { update: { subscription_status: "active", plan: "found_business" } }), true)
      assert.equal((await state()).attempts[0].company_result.plan, "found_business")
    })
    await test("completion atomically saves company result, preserves other tenant, clears lease and permits recovery", async () => {
      const first = await claim()
      await note(first.id)
      const before = await state()
      assert.equal(await complete(first.id, { update: { subscription_status: "trialing", plan: "found_pro", is_founding_member: true, trial_ends_at: "2026-12-01T07:00:00Z" } }), true)
      const after = await state()
      assert.deepEqual(after.companies.find(c => c.id === other), before.companies.find(c => c.id === other))
      const owner = after.companies.find(c => c.id === company)
      assert.equal(owner.subscription_status, "trialing")
      assert.equal(owner.plan, "found_pro")
      assert.equal(owner.is_founding_member, true)
      assert.equal(owner.pending_setup_intent_secret, null)
      assert.equal(owner.trial_ends_at.toISOString(), "2026-12-01T07:00:00.000Z")
      assert.equal(after.attempts[0].state, "completed")
      assert.equal(after.attempts[0].lease_token, null)
      assert.equal(after.attempts[0].lease_until, null)
      const recovered = await claim({ lease: nextToken })
      assert.equal(recovered.id, first.id)
      assert.equal(recovered.state, "completed")
      assert.equal(recovered.stripe_subscription_id, "sub_fixture")
      assert.equal(await complete(first.id, { lease: nextToken }), true)
      assert.deepEqual((await state()).companies, after.companies)
    })
    await test("completion rejects wrong token/subscription, expired lease and invalid result atomically", async () => {
      const first = await claim()
      await note(first.id)
      const before = await state()
      for (const overrides of [{ lease: nextToken }, { subscription: "sub_other" }, { update: { subscription_status: "past_due", plan: "found_pro" } }, { update: { subscription_status: "active", plan: "invalid" } }]) {
        await assert.rejects(() => complete(first.id, overrides), /mapping or lease changed|Invalid activation result|Company plan changed/)
        assert.deepEqual(await state(), before)
      }
      await assert.rejects(() => complete(missing), /Missing activation attempt/)
      await expire(first.id)
      const expired = await state()
      await assert.rejects(() => complete(first.id), /mapping or lease changed/)
      assert.deepEqual(await state(), expired)
    })
    for (const change of ["retired_at=now()", "stripe_customer_id='cus_relinked'"]) {
      await test(`completion rejects changed company mapping (${change})`, async () => {
        const first = await claim()
        await note(first.id)
        await db.query(`update public.companies set ${change} where id=$1`, [company])
        const before = await state()
        await assert.rejects(() => complete(first.id), /mapping or lease changed/)
        assert.deepEqual(await state(), before)
      })
    }
  } else console.log("SKIP completion RPC not present in current migration")
  await test("malformed setup results reject atomically without clearing customer or changing any record", async () => {
    const before = await state()
    // Test SQL NULL separately from JSON null, which saveSetup serializes.
    await assert.rejects(() => service(() => db.query(
      "select public.save_activation_setup($1::uuid,$2,$3,$4,null::jsonb)",
      [company, "cus_fixture", "seti_fixture_secret_local", "incomplete"])), /Invalid activation setup result/)
    assert.deepEqual(await state(), before)
    const malformed = [null, {}, [], "invalid", 17, true,
      { stripe_customer_id: null }, { stripe_customer_id: "" },
      { stripe_customer_id: 17 }, { stripe_customer_id: true },
      { stripe_customer_id: [] }, { stripe_customer_id: {} },
      ...[null, "", "legacy_unknown", 17, [], {}, true].map(plan => ({ stripe_customer_id: "cus_new", plan }))]
    for (const update of malformed) {
      await assert.rejects(() => service(() => saveSetup({ update })), /Invalid activation setup result/)
      assert.deepEqual(await state(), before)
    }
  })
  await test("setup permits omitted plan and each supported plan while preserving unrelated company state", async () => {
    for (const plan of [undefined, "found", "found_pro", "found_business"]) {
      await reset()
      const before = await state()
      const update = { stripe_customer_id: "cus_fixture", ...(plan === undefined ? {} : { plan }) }
      assert.equal(await service(() => saveSetup({ update })), true)
      const after = await state()
      assert.deepEqual(after.companies, before.companies.map(c => c.id === company ? { ...c, plan: plan ?? c.plan } : c))
      assert.deepEqual(after.attempts, before.attempts)
    }
  })
  await test("setup CAS saves matching snapshot and rejects stale responses without mutation", async () => {
    assert.equal(await service(() => saveSetup()), true)
    const saved = await state()
    assert.equal(saved.companies.find(c => c.id === company).pending_setup_intent_secret, "seti_next_secret_local")
    assert.equal(await service(() => saveSetup({ update: { stripe_customer_id: "cus_stale", plan: "found" } })), false)
    assert.deepEqual(await state(), saved)
  })
  await test("setup CAS denies missing/retired company and mismatched customer, intent or status", async () => {
    const before = await state()
    for (const overrides of [{ id: missing }, { customer: "cus_wrong" }, { pending: "seti_wrong_secret_local" }, { status: "past_due" }]) {
      assert.equal(await service(() => saveSetup(overrides)), false)
      assert.deepEqual(await state(), before)
    }
    await db.query("update public.companies set retired_at=now() where id=$1", [company])
    const retired = await state()
    assert.equal(await service(() => saveSetup()), false)
    assert.deepEqual(await state(), retired)
  })
  await test("late setup cannot overwrite completed paid customer mapping or plan", async () => {
    const first = await claim()
    await note(first.id)
    await complete(first.id, { update: { subscription_status: "active", plan: "found_business" } })
    const paid = await state()
    assert.equal(await service(() => saveSetup({ update: { stripe_customer_id: "cus_late", pending_setup_intent_secret: "seti_late_secret_local", plan: "found" } })), false)
    // Even a fresh matching snapshot cannot replace an active/trialing mapping.
    for (const status of ["active", "trialing"]) {
      await db.query("update public.companies set subscription_status=$1 where id=$2", [status, company])
      const before = await state()
      assert.equal(await service(() => saveSetup({ status, pending: null })), false)
      assert.deepEqual(await state(), before)
    }
    assert.deepEqual((await state()).attempts, paid.attempts)
  })
  await test("unresolved pending activation blocks setup in either mode, including expired lease", async () => {
    for (const live of [true, false]) {
      await reset()
      const first = await claim({ live })
      for (const expired of [false, true]) {
        if (expired) await expire(first.id)
        const before = await state()
        assert.equal(await service(() => saveSetup()), false)
        assert.deepEqual(await state(), before)
      }
    }
  })
  await test("competing initial customer setup snapshots accept exactly one mapping", async () => {
    await db.query("update public.companies set stripe_customer_id=null,pending_setup_intent_secret=null where id=$1", [company])
    const before = await state()
    const results = await service(() => Promise.all(["a", "b"].map(suffix => saveSetup({ customer: null, pending: null,
      update: { stripe_customer_id: `cus_initial_${suffix}`, pending_setup_intent_secret: `seti_initial_${suffix}_secret_local`, plan: "found_pro" } }))))
    assert.equal(results.filter(Boolean).length, 1)
    const after = await state()
    const winner = results[0] ? "a" : "b"
    const owner = after.companies.find(c => c.id === company)
    assert.equal(owner.stripe_customer_id, `cus_initial_${winner}`)
    assert.equal(owner.pending_setup_intent_secret, `seti_initial_${winner}_secret_local`)
    assert.deepEqual(after.companies.find(c => c.id === other), before.companies.find(c => c.id === other))
    assert.deepEqual(after.attempts, [])
  })
  console.log(`${groups} activation guard PostgreSQL groups passed; ephemeral local database only. Multi-session row-lock scheduling is not simulated.`)
} finally { await db.close() }
