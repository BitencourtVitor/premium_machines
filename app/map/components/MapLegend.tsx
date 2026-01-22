'use client'

import React from 'react'

interface MapLegendProps {
  isDark: boolean
}

export default function MapLegend({ isDark }: MapLegendProps) {
  const legendItems = [
    { color: isDark ? '#FB923C' : '#EA580C', label: 'MANUTENÇÃO' },
    { color: isDark ? '#F87171' : '#DC2626', label: 'EXCEDIDA' },
    { color: isDark ? '#4ADE80' : '#16A34A', label: 'ATIVA' },
    { color: isDark ? '#60A5FA' : '#2563EB', label: 'AGENDADA' },
    { color: isDark ? '#F472B6' : '#DB2777', label: 'MOVIDA' },
    { color: isDark ? '#A78BFA' : '#9333EA', label: 'EM TRÂNSITO' },
    { color: isDark ? '#818CF8' : '#4F46E5', label: 'ENCERRADA' },
    { color: isDark ? '#9CA3AF' : '#6B7280', label: 'SEM ALOCAÇÃO' },
  ]

  return (
    <div className="absolute bottom-20 left-4 z-[10000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2.5 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-36 transition-all duration-300">
      <h4 className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 px-1">
        Legenda
      </h4>
      <div className="space-y-2">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div 
              className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tracking-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
