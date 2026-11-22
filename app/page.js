import { redirect } from 'next/navigation';
import { isConfigured, supabase } from '../lib/supabase';
import { authenticate } from './actions';
import { QrBrandIcon, StarIcon, WhatsAppIcon, InstagramIcon, LocationIcon, WifiIcon } from './components/icons';

const notices = {
  'check-email': 'Check your inbox for your 6-digit confirmation code.',
  'confirm-error': 'This confirmation link is invalid or expired.',
  'login-error': 'Could not sign in. Check your email and password.',
  'signup-error': 'Could not create your account. Try again in a moment.',
  invalid: 'Enter a valid email and a password of 8–128 characters.',
  setup: 'Connect Supabase in .env.local to enable accounts.',
};

export default async function Home({ searchParams }) {
  const configured = isConfigured();
  if (configured) {
    const client = await supabase();
    const { data: { user } } = await client.auth.getUser();
    if (user) redirect('/dashboard');
  }
  const { notice } = await searchParams;
  const message = Object.hasOwn(notices, notice) ? notices[notice] : null;

  return (
    <main className="entry">
      <section className="intro">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <QrBrandIcon size={34} />
          <span className="wordmark">OneQR</span>
        </div>
        <h1>One QR for your entire business.</h1>
        <p>
          Give customers a single place to find your WhatsApp chat, Google Reviews, Instagram, Directions, Menu, and Wi-Fi.
        </p>

        <div className="hero-feature-chips">
          <span className="feature-chip">
            <WhatsAppIcon size={16} /> WhatsApp Chat
          </span>
          <span className="feature-chip">
            <StarIcon size={14} /> Google Reviews
          </span>
          <span className="feature-chip">
            <InstagramIcon size={15} /> Social Links
          </span>
          <span className="feature-chip">
            <LocationIcon size={15} /> Directions
          </span>
          <span className="feature-chip">
            <WifiIcon size={15} /> Guest Wi-Fi
          </span>
        </div>
      </section>

      <section className="panel" style={{ backdropFilter: 'blur(16px)' }}>
        <h2>Business Workspace</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '20px' }}>
          Sign in to manage your customer landing page and dynamic QR code.
        </p>

        {message && (
          <p className={notice?.includes('error') ? 'notice error-notice' : 'notice'} role="status">
            {message}
          </p>
        )}
        {!configured && (
          <p className="notice error-notice">Connect Supabase to enable sign-in.</p>
        )}

        <form action={authenticate.bind(null, 'login')}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@business.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <div className="actions" style={{ marginTop: '8px' }}>
            <button type="submit" disabled={!configured}>
              Sign in
            </button>
            <button
              type="submit"
              className="secondary"
              formAction={authenticate.bind(null, 'signup')}
              disabled={!configured}
            >
              Create free account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
