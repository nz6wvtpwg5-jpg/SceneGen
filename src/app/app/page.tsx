import type { Metadata } from 'next';
import { NativeAppLanding } from '@/components/landing/native-app-landing';

export const metadata: Metadata = {
  title: 'SceneGen for iPhone',
  description: 'Open your live operations workspace on iPhone.',
};

export default function NativeEntryPage() {
  return <NativeAppLanding />;
}
