'use client'

import { useMemo, useState } from 'react'

type CalendarPeriod = {
  start: string
  end: string | null
  type: 'allocated' | 'maintenance' | 'transit'
  site?: string
}

function buildMachinePeriods(events: any[]): CalendarPeriod[] {
  const sorted = [...events]
    .filter(e => e.status === 'approved' || e.event_type === 'refueling')
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const periods: CalendarPeriod[] = []
  let allocStart: string | null = null
  let allocSite: string | null = null
  let maintenStart: string | null = null
  let transitStart: string | null = null

  for (const e of sorted) {
    const d = e.event_date.split('T')[0]
    switch (e.event_type) {
      case 'start_allocation':
        allocStart = d; allocSite = e.site?.title || null; break
      case 'end_allocation':
        if (allocStart) { periods.push({ start: allocStart, end: d, type: 'allocated', site: allocSite || undefined }); allocStart = null; allocSite = null } break
      case 'downtime_start':
        maintenStart = d; break
      case 'downtime_end':
        if (maintenStart) { periods.push({ start: maintenStart, end: d, type: 'maintenance' }); maintenStart = null } break
      case 'transport_start':
        if (allocStart) { periods.push({ start: allocStart, end: d, type: 'allocated', site: allocSite || undefined }); allocStart = null; allocSite = null }
        transitStart = d; break
      case 'transport_arrival':
        if (transitStart) { periods.push({ start: transitStart, end: d, type: 'transit' }); transitStart = null }
        allocStart = d; allocSite = e.site?.title || null; break
    }
  }
  if (allocStart) periods.push({ start: allocStart, end: null, type: 'allocated', site: allocSite || undefined })
  if (maintenStart) periods.push({ start: maintenStart, end: null, type: 'maintenance' })
  if (transitStart) periods.push({ start: transitStart, end: null, type: 'transit' })
  return periods
}

function getDayPeriod(dateStr: string, periods: CalendarPeriod[]): CalendarPeriod | null {
  const todayStr = new Date().toISOString().split('T')[0]
  for (const p of periods) {
    const end = p.end ?? todayStr
    if (dateStr >= p.start && dateStr <= end) return p
  }
  return null
}

const PERIOD_COLORS = {
  allocated: 'bg-green-500',
  maintenance: 'bg-orange-500',
  transit: 'bg-blue-500',
}

export default function MachineHistoryCalendar({ events }: { events: any[] }) {
  const [tooltip, setTooltip] = useState<{ dateStr: string; period: CalendarPeriod } | null>(null)

  const periods = useMemo(() => buildMachinePeriods(events), [events])

  const months = useMemo(() => {
    if (periods.length === 0) return []
    const earliest = periods.reduce((min, p) => p.start < min ? p.start : min, periods[0].start)
    const start = new Date(earliest + 'T00:00:00')
    const today = new Date()
    const result: Date[] = []
    let m = new Date(today.getFullYear(), today.getMonth(), 1)
    const limit = new Date(start.getFullYear(), start.getMonth(), 1)
    while (m >= limit) {
      result.push(new Date(m))
      m = new Date(m.getFullYear(), m.getMonth() - 1, 1)
    }
    return result
  }, [periods])

  const firstEventDateStr = useMemo(() => {
    if (periods.length === 0) return null
    return periods.reduce((min, p) => p.start < min ? p.start : min, periods[0].start)
  }, [periods])

  const todayStr = new Date().toISOString().split('T')[0]

  if (months.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Sem histórico para exibir</p>
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-[10px] font-medium text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block"></span>Alocado</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block"></span>Manutenção</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>Trânsito</span>
      </div>

      <div className="space-y-4 pr-1">
        {months.map(month => {
          const year = month.getFullYear()
          const mo = month.getMonth()
          const firstDay = new Date(year, mo, 1).getDay()
          const daysInMonth = new Date(year, mo + 1, 0).getDate()
          const monthLabel = month.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

          return (
            <div key={month.toISOString()}>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3 capitalize">{monthLabel}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <div key={i} className="text-xs font-bold text-gray-400 dark:text-gray-500 pb-0.5">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dateObj = new Date(year, mo, day)
                  const dateStr = dateObj.toISOString().split('T')[0]
                  if (dateStr > todayStr) return <div key={day} />
                  const period = getDayPeriod(dateStr, periods)
                  const hasHistory = firstEventDateStr && dateStr >= firstEventDateStr
                  const isToday = dateStr === todayStr
                  const colorClass = period ? PERIOD_COLORS[period.type] : hasHistory ? 'bg-gray-200 dark:bg-gray-700' : ''
                  return (
                    <div
                      key={day}
                      className={`relative w-7 h-7 mx-auto rounded-sm text-xs flex items-center justify-center cursor-default transition-opacity hover:opacity-80
                        ${colorClass}
                        ${isToday ? 'ring-1 ring-yellow-400' : ''}
                        ${period ? 'text-white font-semibold' : hasHistory ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}
                      `}
                      onMouseEnter={() => period && setTooltip({ dateStr, period })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {day}
                      {tooltip?.dateStr === dateStr && tooltip.period && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-gray-900 dark:bg-gray-700 text-white text-[9px] rounded px-1.5 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                          {tooltip.period.type === 'allocated' ? 'Alocado' : tooltip.period.type === 'maintenance' ? 'Manutenção' : 'Trânsito'}
                          {tooltip.period.site && <span className="block opacity-75">{tooltip.period.site}</span>}
                          <span className="block opacity-60">{tooltip.period.start} → {tooltip.period.end ?? 'hoje'}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
