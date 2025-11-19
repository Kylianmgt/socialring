import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default async function SignInPage() {
  const session = await auth();
  
  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 px-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
      
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-3xl bg-linear-to-r from-purple-600 to-blue-600 opacity-30 blur-2xl" />
        
        {/* Card */}
        <div className="relative space-y-8 rounded-3xl border border-white/10 bg-gray-900/90 p-10 shadow-2xl backdrop-blur-xl">
          {/* Logo/Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome Back
            </h1>
            <p className="mt-3 text-base text-gray-400">
              Sign in to manage your social media accounts
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-900 px-4 text-gray-500">Continue with</span>
            </div>
          </div>

          {/* Sign in button */}
          <div className="space-y-4">
            <GoogleSignInButton />
            
            <p className="text-center text-sm text-gray-500">
              By signing in, you agree to our{' '}
              <span className="text-purple-400 hover:text-purple-300">Terms of Service</span>
              {' '}and{' '}
              <span className="text-purple-400 hover:text-purple-300">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
