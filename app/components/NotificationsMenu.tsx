'use client'

import { useState, useRef, useEffect } from 'react'

export default function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Gerenciar foco ao abrir
  useEffect(() => {
    if (isOpen) {
      // Opcional: focar no primeiro item ou no container
      // menuRef.current?.focus()
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className={`p-2 rounded-lg transition-all duration-250 ease-in-out focus:outline-none ${
          isOpen 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        aria-label="Notificações"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notificações"
      >
        <div className="relative">
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          
          {/* Badge para futuras notificações não lidas */}
          {/* 
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span> 
          */}
        </div>
      </button>

      {/* Dropdown Panel */}
      <div
        className={`absolute mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top-right z-50 w-[min(20rem,calc(100vw-2rem))] left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:w-96 sm:translate-x-0 ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Painel de notificações"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
          {/* Botão para marcar todas como lidas (futuro) */}
          {/* <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Marcar todas como lidas</button> */}
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {/* Estado Vazio */}
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-full p-3 mb-3">
              <svg 
                className="w-6 h-6 text-gray-400 dark:text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Nenhuma notificação</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Você será avisado quando houver novidades.</p>
          </div>

          {/* Lista de Notificações (Placeholder para futuro) */}
          {/* 
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
             Aqui serão renderizados os itens de notificação
          </ul> 
          */}
        </div>
        
        {/* Rodapé (opcional, para "Ver todas") */}
        {/* 
        <div className="border-t border-gray-100 dark:border-gray-700 p-2 text-center">
          <button className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">Ver todas as notificações</button>
        </div> 
        */}
      </div>
    </div>
  )
}
