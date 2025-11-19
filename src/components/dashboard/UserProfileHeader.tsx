import Image from 'next/image';

interface UserProfileHeaderProps {
  userName: string;
  userImage?: string | null;
}

export function UserProfileHeader({ userName, userImage }: UserProfileHeaderProps) {
  return (
    <div className="group animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -inset-px rounded-2xl bg-linear-to-r from-purple-600 to-blue-600 opacity-0 blur transition-opacity duration-500 group-hover:opacity-20" />
        
        <div className="relative flex items-center gap-6">
          {userImage ? (
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-linear-to-r from-purple-600 to-blue-600 opacity-75 blur" />
              <Image
                src={userImage}
                alt={userName || 'User'}
                width={80}
                height={80}
                className="relative rounded-full border-4 border-gray-900"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-purple-600 to-blue-600">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          
          <div className="flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-purple-500/20 to-blue-500/20 px-4 py-1 text-sm font-semibold text-purple-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
              </span>
              Active
            </div>
            <h2 className="text-3xl font-bold text-white">
              Welcome back, {userName}!
            </h2>
            <p className="mt-1 text-gray-400">
              Manage your social media accounts and schedule posts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
