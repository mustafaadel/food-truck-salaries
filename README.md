# Food Truck Salaries

A phone-friendly web app for paying food truck workers. Each worker has a **monthly salary** and takes **daily pay** during the month. The app subtracts the daily pay, deductions and payouts, adds bonuses, and shows how much each worker can still take.

> A worker earns 10,000 a month and takes 100 every day. After 30 days they've taken 3,000, so the app shows **7,000 left to pay**.

## What it does

- **Today**: one tap per worker records their daily pay. "Pay all" handles everyone at once, and Undo fixes a mistaken tap.
- **Deductions, bonuses and payouts**, each with a date and an optional note (for example "Absent on Friday").
- **Month**: every worker's salary, daily pay, deductions, bonuses and what's left, plus totals for the month. "Pay the rest" records the end-of-month payout.
- **Running balance**: anything not paid at the end of a month carries into the next one. So does overpayment, as a negative amount.
- **Salary changes** take effect from a chosen month and leave earlier months unchanged. Workers who leave can be marked as left, and their history is kept.
- **Printable statement** for each worker and month, plus a spreadsheet (CSV) and full backup (JSON) download.
- Works on any phone, tablet or computer. You can **add it to your home screen** so it opens like an app. Dark mode follows the phone's setting.
- Amounts can be typed with Arabic digits (١٠٠).

Your records live in your own free [Supabase](https://supabase.com) database, so you can use the app from any phone and nothing is lost if a phone is. The website itself is hosted for free on GitHub Pages.

## Setup (one time, about 10 minutes)

### 1. Create the database

1. Sign up at [supabase.com](https://supabase.com) (free) and click **New project**. Pick any name, set a database password, and choose the region closest to you.
2. When the project is ready, open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Open **Authentication → Users → Add user → Create new user**. Enter the email and password you'll sign in with, and tick **Auto Confirm User**. The first login you create becomes an admin automatically.
4. Open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**, so nobody else can create an account.
5. Open **Project Settings → API Keys** and copy the **Project URL** and the **publishable key** (the `anon` key on older projects).

The publishable key is safe to put in a website. Row level security in the schema only lets admins see or change records. Anyone else, signed in or not, gets nothing.

### 2. Turn on the website

1. Put the Project URL and publishable key in [`.env.production`](.env.production) (already done for this repository).
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages → Run workflow**. After a minute or two the app is live at `https://<your-github-username>.github.io/food-truck-salaries/`.

Every push to `main` tests, builds and publishes the app again.

### 3. Put it on your phone

Open the link and sign in.

- **iPhone (Safari)**: tap Share, then **Add to Home Screen**.
- **Android (Chrome)**: tap the ⋮ menu, then **Add to Home screen** or **Install app**.

### Adding another admin

Admins share the same workers and payments. To add one:

1. In the app, open **Settings → Admins** and add their email.
2. In Supabase, open **Authentication → Users → Add user → Create new user**. Use the same email, set a password, and tick **Auto Confirm User**.
3. Send them the app link and their password. They can change the password under **Settings → Change password**.

Remove an admin from the same list and they immediately lose access. Their login can stay or be deleted in Supabase, and the records they created stay either way. Nobody can remove themselves, so there's always at least one admin.

### Updating the database

When a new version changes [`supabase/schema.sql`](supabase/schema.sql), paste the whole file into the SQL Editor again and click **Run**. It updates the database in place and keeps all records.

### Good to know

- Free Supabase projects pause after a week with no use. Daily use keeps yours awake. If it does pause, open the project in Supabase and click **Restore**. No data is lost.
- To try the app without a database, choose **Try with sample data** on the first screen. Demo data stays on that device only.

## How the numbers are worked out

For each worker, month by month from the month they started:

```
left to pay = left from earlier months
            + monthly salary + bonuses
            − daily pay − deductions − payouts
```

The salary stops after the month a worker is marked as left, but their balance stays until it's paid. The calculation is in [`src/lib/payroll.ts`](src/lib/payroll.ts) and is covered by tests in [`src/lib/payroll.test.ts`](src/lib/payroll.test.ts).

## Development

```sh
npm install
npm run dev      # start locally, then choose "Try with sample data"
npm test         # unit tests
npm run build    # production build in dist/
```

`npm run dev` ignores `.env.production`, so it starts on the setup screen. To use your database locally, copy `.env.production` to `.env.local`.

Built with React, TypeScript, Vite and Supabase.
