import Image from 'next/image'

interface LoginHeaderProps {
  mounted: boolean
  isDark: boolean
  userType: 'internal' | 'external' | null
  selectedUserId: string | null
}

export default function LoginHeader({ mounted, isDark, userType, selectedUserId }: LoginHeaderProps) {
  return (
    <div className="text-center mb-8 relative z-10">
      <div className="flex items-center justify-center gap-3 mb-2">
        {/* Logo com renderização condicional para evitar hydration mismatch */}
        {mounted ? (
          <Image
            src={isDark ? '/premium_logo_vetorizado_white.png' : '/premium_logo_vetorizado.png'}
            alt="Premium Logo"
            width={28}
            height={28}
            className="object-contain flex-shrink-0"
            priority
          />
        ) : (
          // Placeholder durante SSR para evitar hydration mismatch
          <div className="w-7 h-7 flex-shrink-0" />
        )}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
        <span className="text-3xl text-gray-900 dark:text-white">Machines</span>
      </div>
      {!userType ? (
        <p className="text-gray-600 dark:text-gray-400">Select your access type</p>
      ) : !selectedUserId ? (
        <p className="text-gray-600 dark:text-gray-400">
          {userType === 'internal' ? 'Select a user to continue' : 'Select your company or service provider'}
        </p>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">Enter your 6-digit PIN</p>
      )}
    </div>
  )
}
