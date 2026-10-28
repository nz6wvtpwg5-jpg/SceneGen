import { redirect } from 'next/navigation';

export default function LegacyProfileEditorPage() {
  redirect('/settings?tab=workspace');
}
