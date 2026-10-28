import { redirect } from 'next/navigation';

export default function LegacyManagePage() {
  redirect('/settings?tab=personal');
}
