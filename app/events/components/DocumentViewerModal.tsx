'use client'

import React from 'react'
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
  if (!isOpen) return null

  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
  const isPDF = fileType === 'application/pdf' || /\.pdf$/i.test(fileName)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {unitNumber}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[500px]">
              {fileName.split('_').slice(1).join('_') || fileName}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Baixar arquivo"
            >
              <FiDownload size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Fechar"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-6 flex items-center justify-center">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={fileName} 
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          ) : isPDF ? (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-[70vh] rounded-lg border-0 shadow-md"
              title={fileName}
            />
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
}
