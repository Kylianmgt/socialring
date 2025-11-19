import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Redirect to dashboard directly
  redirect('/dashboard');
}
