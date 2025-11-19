import Link from 'next/link';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    OAuthSignin: 'Error in constructing an authorization URL.',
    OAuthCallback: 'Error in handling the response from the OAuth provider.',
    OAuthCreateAccount: 'Could not create OAuth provider user in the database.',
    EmailCreateAccount: 'Could not create email provider user in the database.',
    Callback: 'Error in the OAuth callback handler route.',
    OAuthAccountNotLinked: 'This email is already linked to another account.',
    EmailSignin: 'The verification email could not be sent.',
    CredentialsSignin: 'Sign in failed. Check the credentials you provided.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected error occurred. Please try again.',
  };

  const params = await searchParams;
  const error = params.error || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      <div className="relative w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-red-400">
            {errorMessage}
          </p>
          {error === 'OAuthAccountNotLinked' && (
            <p className="mt-2 text-xs text-gray-400">
              To confirm your identity, sign in with the same account you used originally.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="group relative flex w-full justify-center overflow-hidden rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50"
          >
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Try Again</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
