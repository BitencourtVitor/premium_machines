'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FiFile, FiImage, FiDownload, FiLoader } from 'react-icons/fi'

interface EventDocumentsProps {
  eventId: string
}

interface FileObject {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: any
}

export default function EventDocuments({ eventId }: EventDocumentsProps) {
  const [files, setFiles] = useState<FileObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFiles() {
      if (!eventId) return
      
      setLoading(true)
      try {
        const { data, error: storageError } = await supabase.storage
          .from('Allocation Documents')
          .list(eventId)

        if (storageError) {
          console.error('Error fetching files:', storageError)
          setError('Erro ao carregar arquivos')
        } else {
          // Filtrar o arquivo .keep que usamos para garantir que a pasta exista
          const filteredFiles = (data || []).filter(file => file.name !== '.keep')
          setFiles(filteredFiles)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado')
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [eventId])

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('Allocation Documents')
        .download(`${eventId}/${fileName}`)

      if (downloadError) {
        throw downloadError
      }

      // Create a URL for the blob and trigger download
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
        <FiLoader className="animate-spin" />
        <span>Carregando documentos...</span>
      </div>
    )
  }

  if (files.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Documentos Anexados
      </div>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
          return (
            <div 
              key={file.name}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
            >
              {isImage ? (
                <FiImage className="text-blue-500 flex-shrink-0" />
              ) : (
                <FiFile className="text-red-500 flex-shrink-0" />
              )}
              <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300">
                {file.name.split('_').slice(1).join('_') || file.name}
              </span>
              <button
                onClick={() => handleDownload(file.name)}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-600 dark:text-blue-400 transition-colors"
                title="Download"
              >
                <FiDownload size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
