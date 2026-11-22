import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isConfigured, supabase } from '../../../lib/supabase';
import { resendSignupCode, verifySignup } from '../../actions';

const messages = {
  invalid: 'The code is incorrect or expired. Check your email or request a new code.',
  resent: 'Check your inbox for a new code. Use the latest email.',
  'resend-error': 'Could not send another code. Wait a minute before trying again.',
};

export default async function VerifyEmail({ searchParams }) {
  if (!isConfigured()) redirect('/');
  const client = await supabase();
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect('/dashboard');
  const email = (await cookies()).get('oneqr_pending_email')?.value;
  if (!email) redirect('/');
  const { notice } = await searchParams;
  return <main className="dashboard">
    <span className="wordmark">OneQR</span>
    <h1>Verify your email</h1>
    <section className="panel onboarding">
      <p>Enter the 6-digit code sent to <strong>{email}</strong>.</p>
      {Object.hasOwn(messages, notice) && <p className="notice" role="status">{messages[notice]}</p>}
      <form action={verifySignup}>
        <label>Verification code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
        </label>
        <button>Verify email</button>
      </form>
      <div className="actions" style={{ marginTop: 16, alignItems: 'center' }}>
        <form action={resendSignupCode}><button className="secondary">Resend code</button></form>
        <Link href="/">Back to sign in</Link>
      </div>
    </section>
  </main>;
}
