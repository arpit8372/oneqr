import Link from 'next/link';
import { requireDashboardUser } from '../../lib/dashboard';
import { signOut } from '../actions';
import { QrBrandIcon } from '../components/icons';

export default async function DashboardLayout({ children }) {
  const client = await requireDashboardUser();
  const { data: isSuperAdmin, error } = await client.rpc('is_super_admin');
  if (error) console.error('Dashboard superadmin check failed:', error);
  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="wordmark" href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <QrBrandIcon size={26} />
          <span>OneQR</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Business dashboard">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/page">Page Editor</Link>
          <Link href="/dashboard/qr">QR Codes</Link>
          <Link href="/dashboard/analytics">Analytics</Link>
          {isSuperAdmin && <Link href="/dashboard/admin">Superadmin</Link>}
        </nav>
        <form action={signOut} style={{ margin: 0 }}>
          <button type="submit" className="secondary" style={{ padding: '7px 14px', fontSize: '0.86rem' }}>
            Sign out
          </button>
        </form>
      </header>
      <main className="dashboard">{children}</main>
    </div>
  );
}
