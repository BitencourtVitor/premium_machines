'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FiFile, FiImage, FiDownload, FiEye, FiLoader, FiPaperclip } from 'react-icons/fi'
import DocumentViewerModal from './DocumentViewerModal'

interface EventDocumentPopoverProps {
  eventId: string
  unitNumber: string
}

interface FileObject {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: any
}

export default function EventDocumentPopover({ eventId, unitNumber }: EventDocumentPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<FileObject[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFiles = async () => {
    if (!eventId || files.length > 0) return
    
    setLoading(true)
    try {
      const { data, error: storageError } = await supabase.storage
        .from('Allocation Documents')
        .list(eventId)

      if (!storageError) {
        const filteredFiles = (data || []).filter(file => file.name !== '.keep')
        setFiles(filteredFiles)
      }
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
    fetchFiles()
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('Allocation Documents')
        .download(`${eventId}/${fileName}`)

      if (downloadError) throw downloadError

      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading file:', err)
      alert('Erro ao baixar arquivo')
    }
  }

  const handleView = async (fileName: string) => {
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('Allocation Documents')
        .getPublicUrl(`${eventId}/${fileName}`)

      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
      const isPDF = /\.pdf$/i.test(fileName)
      
      setSelectedFile({
        url: publicUrl,
        name: fileName,
        type: isImage ? 'image/jpeg' : isPDF ? 'application/pdf' : 'application/octet-stream'
      })
      setIsModalOpen(true)
      setIsOpen(false)
    } catch (err) {
      console.error('Error getting public URL:', err)
      alert('Erro ao abrir documento')
    }
  }

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
          isOpen 
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30'
        }`}
        title="Ver documentos"
      >
        <FiPaperclip className="w-5 h-5" />
        {files.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
            {files.length}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-[60] animate-in fade-in slide-in-from-right-2 duration-200"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-72 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Documentos ({files.length})
              </span>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                  <FiLoader className="animate-spin w-6 h-6" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Nenhum documento anexado
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
                    return (
                      <div 
                        key={file.name}
                        className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isImage ? (
                            <FiImage className="text-blue-500 w-4 h-4 flex-shrink-0" />
                          ) : (
                            <FiFile className="text-red-500 w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                            {file.name.split('_').slice(1).join('_') || file.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleView(file.name)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(file.name)}
                            className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Baixar"
                          >
                            <FiDownload size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-white dark:bg-gray-800 border-r border-t border-gray-100 dark:border-gray-700 rotate-45"></div>
        </div>
      )}

      {/* Viewer Modal */}
      {selectedFile && (
        <DocumentViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          fileType={selectedFile.type}
          unitNumber={unitNumber}
          onDownload={() => handleDownload(selectedFile.name)}
        />
      )}
    </div>
  )
}
