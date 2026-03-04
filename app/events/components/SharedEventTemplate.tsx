'use client'

import React, { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { FiCalendar, FiMapPin, FiTool, FiUser, FiInfo } from 'react-icons/fi'
import { LuHash } from 'react-icons/lu'
import { AllocationEvent } from '../types'
import { formatDateOnly, getEventConfig } from '../utils'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'

interface SharedTemplateProps {
  event: AllocationEvent | null
  logoUrl: string
}

export const SharedEventTemplate = React.forwardRef<HTMLDivElement, SharedTemplateProps>(
  ({ event, logoUrl }, ref) => {
    if (!event) return null

    const config = getEventConfig(event.event_type)
    const Icon = config.icon

    const getTemplateColors = (colorName: string) => {
      switch (colorName) {
        case 'blue': return { bg: '#EFF6FF', text: '#1E40AF' }
        case 'red': return { bg: '#FEF2F2', text: '#B91C1C' }
        case 'orange': return { bg: '#FFF7ED', text: '#C2410C' }
        case 'green': return { bg: '#F0FDF4', text: '#15803D' }
        case 'yellow': return { bg: '#FEFCE8', text: '#A16207' }
        case 'purple': return { bg: '#FAF5FF', text: '#7E22CE' }
        case 'indigo': return { bg: '#FEF5E7', text: '#F39C12' }
        case 'teal': return { bg: '#F0FDFA', text: '#0F766E' }
        case 'cyan': return { bg: '#ECFEFF', text: '#0E7490' }
        default: return { bg: '#F9FAFB', text: '#374151' }
      }
    }

    const templateColors = getTemplateColors(config.color)

    // Renderiza via Portal no final do body para evitar qualquer restrição de overflow
    // mas mantém fora da vista para captura via html2canvas
    if (typeof document === 'undefined') return null

    return createPortal(
      <div className="fixed top-[-10000px] left-[-10000px] pointer-events-none" aria-hidden="true">
        <div 
          ref={ref}
          className="w-[450px] p-6 font-sans text-gray-900"
          style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif', 
            backgroundColor: '#ffffff',
            display: 'block'
          }}
        >
          {/* Header Area */}
          <div className="flex items-center gap-3 mb-5 border-b pb-4" style={{ borderColor: '#f3f4f6' }}>
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: templateColors.bg, color: templateColors.text }}
            >
              <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none mb-1">
                {event.machine?.unit_number || 'SOLICITAÇÃO'}
              </h1>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                {config.label}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Image 
                src={logoUrl} 
                alt="Premium" 
                width={100}
                height={28}
                className="h-7 w-auto object-contain opacity-80"
                crossOrigin="anonymous"
                unoptimized
              />
            </div>
          </div>

          {/* Data Blocks */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <FiCalendar size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">DATA</label>
                  <p className="text-sm font-bold text-gray-800 leading-tight">
                    {formatDateOnly(event.event_date)}
                    {event.end_date && <span className="block text-gray-400 text-[10px]">Vence {formatDateOnly(event.end_date)}</span>}
                  </p>
                </div>
              </div>

              {event.site && (
                <div className="flex items-start gap-2">
                  <FiMapPin size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">LOCAL</label>
                    <div className="flex items-center gap-2 min-h-[22px]">
                      <p className="text-sm font-bold text-gray-800 leading-tight flex-1">
                        {event.site.title}
                      </p>
                      {event.lot_building_number && (
                        <div 
                          className="h-5 px-2 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}
                        >
                          <span className="text-[10px] font-black uppercase leading-none">
                            LOTE: {event.lot_building_number}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {(event.supplier || event.extension) && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
                {event.supplier && (
                  <div className="flex items-start gap-2 flex-1 mr-2">
                    <FiTool size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">FORNECEDOR</label>
                      <p className="text-sm font-bold text-gray-800 leading-tight break-words">{event.supplier.nome}</p>
                    </div>
                  </div>
                )}

                {event.extension && (
                  <div className="flex items-start gap-2">
                    <LuHash size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">EQUIPAMENTO</label>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{event.extension.unit_number}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t flex justify-between items-center min-h-[44px]" style={{ borderColor: '#f3f4f6' }}>
              {event.created_by_user && (
                <div className="flex items-start gap-2 flex-1 mr-2">
                  <FiUser size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">POR</label>
                    <p className="text-xs font-bold text-gray-800 leading-tight break-words">{event.created_by_user.nome}</p>
                  </div>
                </div>
              )}
              
              {event.downtime_reason && (
                <div 
                  className="h-6 px-3 rounded-full border flex items-center justify-center gap-1.5 flex-shrink-0"
                  style={{ backgroundColor: '#FFF7ED', borderColor: '#FED7AA', color: '#9A3412' }}
                >
                  <FiInfo size={12} className="flex-shrink-0" />
                  <span className="text-[10px] font-black uppercase leading-none">
                    {DOWNTIME_REASON_LABELS[event.downtime_reason]}
                  </span>
                </div>
              )}
            </div>

            {event.notas && (
              <div 
                className="p-3 rounded-xl border mt-2 flex flex-col justify-center min-h-[50px]"
                style={{ backgroundColor: '#F5F5F5', borderColor: '#EEEEEE' }}
              >
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">OBSERVAÇÕES</label>
                <p className="text-xs text-gray-600 leading-normal italic">
                  &quot;{event.notas}&quot;
                </p>
              </div>
            )}
          </div>

          <div 
            className="mt-6 pt-4 border-t flex justify-between items-center text-[9px] font-black tracking-[0.2em] uppercase"
            style={{ borderColor: '#EEEEEE', color: '#BDBDBD' }}
          >
            <span>PREMIUM MACHINES</span>
            <span>{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
          </div>
        </div>
      </div>,
      document.body
    )
  }
)

SharedEventTemplate.displayName = 'SharedEventTemplate'
