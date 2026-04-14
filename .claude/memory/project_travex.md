---
name: TravEx Project Context
description: Core facts about the stripe-dboard project — what it is, who uses it, and how it's deployed
type: project
---

TravEx is a telehealth platform. This dashboard (stripe-dboard / helimeds.com) is a real internal ops tool used by a single operator for now.

**Stack decisions:**
- Data: Stripe API (live data, not mock)
- Hosting: Railway
- Database: PostgreSQL on Railway
- Scheduled jobs: Railway Cron

**Why:** Single-operator tool to monitor and manage Stripe payments for the TravEx telehealth platform.

**How to apply:** Scope features around a single power user's needs — no multi-tenancy, no user auth complexity. Prioritize data freshness (cron sync), financial clarity, and operational efficiency over flashy analytics.
