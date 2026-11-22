import { redirect } from 'next/navigation';

export default function BusinessSettings() {
  redirect('/dashboard/page?section=profile');
}
