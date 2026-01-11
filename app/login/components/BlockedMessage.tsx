import CountdownTimer from '../../components/CountdownTimer'

interface BlockedMessageProps {
  blocked: boolean
  blockedUntil: Date | null
  onComplete: () => void
}

export default function BlockedMessage({ blocked, blockedUntil, onComplete }: BlockedMessageProps) {
  const calculateRemainingSeconds = (): number => {
    if (!blockedUntil) return 0
    const now = new Date()
    const diff = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
    return Math.max(0, diff)
  }

  if (!blocked || !blockedUntil) return null

  return (
    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
      <CountdownTimer
        seconds={calculateRemainingSeconds()}
        onComplete={onComplete}
      />
    </div>
  )
}
