# OneQR

OneQR is a Next.js App Router application with Supabase authentication, business
onboarding, public customer pages, and dynamic QR codes.

## Run locally

1. Use Node.js 20.9+ and run `npm ci` in this folder.
2. Apply `supabase/migrations/0001_foundation.sql` once to a new Supabase project.
   Apply subsequent numbered migrations in order. If earlier migrations are
   already applied, apply only the next migration that is not yet applied.
3. Copy `.env.example` to `.env.local` and set the Supabase project URL,
   publishable key, and `APP_ORIGIN` to the canonical origin of the app.
   In local development, set `APP_ORIGIN` to the URL printed by `next dev`.
4. Set the Supabase Auth Site URL to the local app origin. Email/password signup
   goes directly to the dashboard when Confirm email is disabled. To use the
   optional OTP flow, enable confirmation, use six-digit email OTPs, and set the
   Confirm signup template from `supabase/templates/confirm-signup.html`.
5. Run `npm run dev`, create an account, add a business, configure and publish
   its customer page, then create and download a QR code.
   Optional phone, email, location, offer, and guest Wi-Fi details appear on the
   public page only after publishing. Apply migrations through
   `0005_optional_profile_publish.sql` to allow publishing without configuring
   an action button, and `0006_business_profile_images.sql` to enable public
   business profile photos. Apply `0007_superadmin_vendor_subscriptions.sql`
   to enable platform administration and subscription enforcement. This
   migration leaves existing vendors unassigned, so their public pages and QR
   destinations stay disabled until a superadmin assigns a plan. Apply
   `0008_qr_analytics.sql` to record QR scans and action-link clicks and show
   per-QR aggregate analytics in the vendor dashboard. Analytics do not store
   visitor names, phone numbers, or IP addresses; counts begin after migration.
6. After applying migration 0007, provision the initial superadmin with the
   email used for their OneQR login:
   ```sql
   insert into public.super_admins(user_id)
   select id from auth.users where lower(email) = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```
   Then sign in and open `/dashboard/admin`. Superadmins can edit vendor and
   customer-page details, assign plans for 1–120 months, or pause a plan.
   Active plans expire automatically; no payment processor or automatic billing
   is configured. Only publish Wi-Fi credentials for a guest network intended
   for customers.
7. Set `APP_ORIGIN` and the matching Supabase Site URL to the deployed app's
   canonical origin. On Vercel, QR links use the project's production hostname
   automatically when `APP_ORIGIN` is unset; set `APP_ORIGIN` to use a custom
   domain.

The onboarding transaction creates the user's profile, direct-business workspace,
owner membership, business, and initial branding. Retrying returns the existing
first business. This milestone uses the account's first business for onboarding.
AI review assistance, a digital menu editor, and payment processing remain future
milestones.

## Send verification emails through Brevo

Authenticate your sender domain and configure a sender in Brevo. In Supabase
Authentication's SMTP settings, enable custom SMTP and configure the sender name
(OneQR), verified sender address, host `smtp-relay.brevo.com`, port `587`,
Brevo SMTP login as username, and Brevo SMTP key as password.
