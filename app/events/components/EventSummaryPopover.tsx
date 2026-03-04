'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiMessageSquare, FiDownload, FiCheck, FiLoader } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import html2canvas from 'html2canvas'
import { AllocationEvent } from '../types'
import { formatDateOnly } from '../utils'
import { SharedEventTemplate } from './SharedEventTemplate'

interface EventSummaryPopoverProps {
  event: AllocationEvent
}

export default function EventSummaryPopover({ event }: EventSummaryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setLogoUrl(`${window.location.origin}/premium_logo_vetorizado.png`)
  }, [])

  const generateImage = async () => {
    if (imageUrl || isGenerating) return
    setIsGenerating(true)
    
    try {
      // Pequeno delay para garantir que o componente SharedEventTemplate foi montado e renderizado com os dados do evento
      await new Promise(resolve => setTimeout(resolve, 100))

      if (!templateRef.current) {
        console.warn('Template ref is null after delay')
        return
      }

      // Ensure logo is loaded before capturing
      const logoImg = templateRef.current.querySelector('img')
      if (logoImg && !logoImg.complete) {
        await new Promise((resolve) => {
          logoImg.onload = resolve
          logoImg.onerror = resolve
        })
      }

      // Capture with optimized settings
      const canvas = await html2canvas(templateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 2x for high quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 5000,
        removeContainer: true
      })

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9))
      
      if (blob) {
        const url = URL.createObjectURL(blob)
        setImageBlob(blob)
        setImageUrl(url)
      }
    } catch (err) {
      console.error('Error generating image:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopoverPos({
        top: rect.top + rect.height / 2,
        left: rect.left - 12
      })
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    updatePosition()
    setIsOpen(true)
    if (!imageUrl) generateImage()
  }

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 300)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!imageBlob) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': imageBlob
        })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!imageUrl) return
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `evento-${event.machine?.unit_number || 'solicitacao'}-${formatDateOnly(event.event_date)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative inline-block">
      {/* Trigger Button - Styled like EventDocumentPopover */}
      <button
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
          isOpen 
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30'
        }`}
      >
        <FaWhatsapp className="w-5 h-5" />
      </button>

      {/* Popover via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[9999] animate-in fade-in slide-in-from-right-2 duration-200 pointer-events-auto"
          style={{ 
            top: `${popoverPos.top}px`, 
            left: `${popoverPos.left}px`,
            transform: 'translate(-100%, -50%)'
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-[420px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resumo do Evento
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {event.machine?.unit_number || 'Solicitação'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {imageUrl && (
                  <>
                    <button
                      onClick={handleCopy}
                      className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                        copied 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title="Copiar para WhatsApp"
                    >
                      {copied ? <FiCheck size={16} /> : <FaWhatsapp size={18} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                      title="Baixar imagem"
                    >
                      <FiDownload size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preview Area */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center min-h-[300px]">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <FiLoader className="animate-spin w-6 h-6 text-blue-500" />
                  <span className="text-xs font-medium">Gerando resumo...</span>
                </div>
              ) : imageUrl ? (
                <div className="w-full rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden bg-white">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <span className="text-xs text-red-500">Erro ao gerar visualização</span>
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-white dark:bg-gray-800 border-r border-t border-gray-100 dark:border-gray-700 rotate-45"></div>
        </div>,
        document.body
      )}

      {/* Template compartilhado para captura via html2canvas - Renderizado apenas quando necessário */}
      {(isOpen || isGenerating) && (
        <SharedEventTemplate 
          ref={templateRef} 
          event={event} 
          logoUrl={logoUrl} 
        />
      )}
    </div>
  )
}
