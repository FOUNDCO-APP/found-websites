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
- Verify outreach history appears on the client detail page.

## Clients

- Verify client rows are easy to scan on mobile.
- Verify tapping the full client row opens the client detail page.
- Verify plan, billing, health, activity, and outreach indicators stay readable with long business names.

## Growth

- Verify period selector works for week, month, quarter, and year.
- Verify chart spacing and section hierarchy are readable on mobile.
- Verify upgrade opportunities and leads do not crowd the growth chart.
- Verify lead call, text, email, and skip logs create follow-up timing.
- Verify lead follow-up filters show needs follow-up, due, later, recently contacted, stale, and all.
- Verify lead text and email quick actions include prefilled copy.
- Verify Growth campaign lists show counts and expandable members.
- Verify campaign lists include clients, leads, inactive clients, trialing inactive, stale leads, upgrade-ready clients, billing risk, and first-week clients.
- Verify campaign list email actions use available emails only.
- Verify outreach and automation draft copy sounds personal from Super Shawn, not like a generic brand blast.
- Verify automation draft member actions open prefilled text/email one person at a time.
- Verify automation draft copy button copies the personalized message.
- Verify automation draft Mark reviewed logs outreach and creates a short follow-up.
- Verify automation draft Send email uses Resend for one recipient, creates an email log row, and logs outreach only after success.
- Verify Growth test send sandbox shows only `account_kind = test`, Shawn/Sean email, Sayitmarketing, and marketing test identities.
- Verify Growth test send sandbox accounts do not appear in real campaign lists, automation drafts, Growth lead counts, MRR, or signup goals.
- Verify test sandbox Open text, Open email, Copy, Mark reviewed, and Send email work without changing real outreach queues.
