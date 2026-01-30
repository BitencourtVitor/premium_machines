'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { FiX, FiDownload } from 'react-icons/fi'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  fileType: string
  unitNumber: string
  onDownload: () => void
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  unitNumber,
  onDownload
}: DocumentViewerModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
  const isPDF = fileType === 'application/pdf' || /\.pdf$/i.test(fileName)

  const content = (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div className="flex flex-col min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
              {unitNumber}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {fileName.split('_').slice(1).join('_') || fileName}
            </p>
          </div>
          
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl transition-all font-medium"
              title="Baixar arquivo"
            >
              <FiDownload size={18} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              title="Fechar"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-black p-4 sm:p-8 flex items-center justify-center">
          {isImage ? (
            <div className="relative w-full h-full">
              <Image 
                src={fileUrl} 
                alt={fileName} 
                fill
                className="object-contain rounded-lg shadow-2xl"
                unoptimized
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe 
                src={`${fileUrl}#toolbar=0`} 
                className="w-full h-full rounded-lg border-0 shadow-2xl bg-white"
                title={fileName}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400 py-12">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <FiX size={48} />
              </div>
              <p>Visualização não disponível para este tipo de arquivo.</p>
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiDownload size={18} />
                Baixar para ver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
