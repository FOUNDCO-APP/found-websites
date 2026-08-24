# Found HQ Admin QA Checklist

Use this after the current build sprint to test the admin updates end to end.

## Client Health

- Verify customer-side activity appears after a real client dashboard action.
- Verify admin HQ usage does not count as client activity.
- Verify admin view-as usage does not count as client activity.
- Verify quiet, stagnant, no activity, trialing inactive, needs follow-up, and recently contacted filters.
- Verify call, text, email, and skip logs remove a client from the outreach queue temporarily.
- Verify call, text, and email logs create a 3-day follow-up.
- Verify skip logs create a 7-day follow-up.
- Verify follow-up due and follow-up later filters show the correct accounts.
- Verify Client Health shows the last outreach method and timing, for example `Email sent 2d ago / follow up in 1d`.
- Verify clients with a future follow-up stay out of the main outreach queue until the follow-up date.
- Verify outreach history appears on the client detail page.
- Verify Client Health text/email copy changes for trialing inactive, no activity, dashboard-only, stagnant, and missing-tool clients.

## Today

- Verify Today excludes test accounts and test leads from counts and next actions.
- Verify Today prioritizes payment risk, launch blockers, lead follow-up, trialing inactive, no activity, dashboard-only, and stagnant clients.
- Verify Today keeps Next actions short and links each item to the right Growth, Client Health, or client detail page.

## Clients

- Verify client rows are easy to scan on mobile.
- Verify tapping the full client row opens the client detail page.
- Verify plan, billing, health, activity, and outreach indicators stay readable with long business names.
- Verify client rows show the real activity reason and tool action count.
- Verify client detail opens with account, payment, usage, outreach, and next action visible before deep sections.
- Verify client detail command center answers whether the client is active, paying, using Found, and what to do next.
- Verify client detail shows top tool, missing tools, and dashboard-only/no-activity language correctly.

## Growth

- Verify period selector works for week, month, quarter, and year.
- Verify chart spacing and section hierarchy are readable on mobile.
- Verify upgrade opportunities and leads do not crowd the growth chart.
- Verify lead call, text, email, and skip logs create follow-up timing.
- Verify lead follow-up filters show needs follow-up, due, later, recently contacted, stale, and all.
- Verify lead text and email quick actions include prefilled copy.
- Verify Growth campaign lists show counts and expandable members.
- Verify campaign lists include clients, leads, inactive clients, trialing inactive, stale leads, upgrade-ready clients, billing risk, and first-week clients.
- Verify campaign lists include dashboard-only clients and clients who have never used leads, photos, or estimates.
- Verify campaign list email actions use available emails only.
- Verify outreach and automation draft copy sounds personal from Super Shawn, not like a generic brand blast.
- Verify automation draft member actions open prefilled text/email one person at a time.
- Verify automation draft copy button copies the personalized message.
- Verify automation draft Mark reviewed logs outreach and creates a short follow-up.
- Verify automation draft Send email uses Resend for one recipient, creates an email log row, and logs outreach only after success.
- Verify client automation drafts use reason-specific copy for dashboard-only, inactive, no activity, and missing-tool clients.
- Verify Growth automation drafts suppress clients with future follow-ups while campaign audience lists still show them for manual review.
- Verify Growth campaign members show last client outreach memory when available.
- Verify Growth Outreach rules shows Lead first touch, Lead follow-up due, Trial rescue, Inactive client, Dashboard-only, Tool adoption, and First-week check-in.
- Verify each outreach rule shows status, ready now, suppressed by follow-up, missing contact, and last sent.
- Verify no real client receives automation unless a rule is explicitly armed in a future release.
- Verify Growth test send sandbox shows only `account_kind = test`, Shawn/Sean email, Sayitmarketing, and marketing test identities.
- Verify Growth test send sandbox accounts do not appear in real campaign lists, automation drafts, Growth lead counts, MRR, or signup goals.
- Verify test sandbox Open text, Open email, Copy, Mark reviewed, and Send email work without changing real outreach queues.
