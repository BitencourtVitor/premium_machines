import PinInput from '../../components/PinInput'

interface PinEntryProps {
  selectedUser: any
  loading: boolean
  blocked: boolean
  error: string
  remainingAttempts: number | null
  onBack: () => void
  onComplete: (pin: string) => void
}

export default function PinEntry({
  selectedUser,
  loading,
  blocked,
  error,
  remainingAttempts,
  onBack,
  onComplete
}: PinEntryProps) {
  return (
    <>
      {/* Botão de voltar */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to user selection
      </button>

      {/* Nome do usuário selecionado */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">Logging in as:</p>
        <p className="font-medium text-gray-900 dark:text-white">
          {selectedUser?.nome}
        </p>
      </div>

      <PinInput
        onComplete={onComplete}
        disabled={loading || blocked}
        error={!!error && !blocked}
      />

      {/* Mensagens de erro */}
      {error && (
        <div className={`mt-4 p-3 rounded-lg text-sm text-center ${
          blocked 
            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
        }`}>
          {error}
        </div>
      )}

      {/* Tentativas restantes */}
      {remainingAttempts !== null && remainingAttempts > 0 && !blocked && (
        <div className="mt-2 text-center text-sm text-blue-600 dark:text-blue-400">
          Attempts remaining: {remainingAttempts}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      )}
    </>
  )
}
