'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { HiOutlineExclamationTriangle, HiOutlineInformationCircle, HiOutlineXCircle } from 'react-icons/hi2'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmButtonText?: string
  cancelButtonText?: string
  isDangerous?: boolean
  isLoading?: boolean
  error?: string | null
  showInput?: boolean
  inputValue?: string
  onInputChange?: (value: string) => void
  inputPlaceholder?: string
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  isDangerous = false,
  isLoading = false,
  error,
  showInput = false,
  inputValue = '',
  onInputChange,
  inputPlaceholder = 'Digite aqui...'
}: ConfirmModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[10020]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-gray-100 dark:border-gray-700">
                <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      isDangerous 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {isDangerous ? (
                        <HiOutlineExclamationTriangle className="w-6 h-6" />
                      ) : (
                        <HiOutlineInformationCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <DialogTitle as="h3" className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                        {title}
                      </DialogTitle>
                      <div className="mt-2">
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {message}
                        </p>
                      </div>

                      {showInput && (
                        <div className="mt-4">
                          <textarea
                            value={inputValue}
                            onChange={(e) => onInputChange?.(e.target.value)}
                            placeholder={inputPlaceholder}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {error && (
                    <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                      <HiOutlineXCircle className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" />
                      <p className="font-medium">{error}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-5 flex flex-col sm:flex-row-reverse gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    disabled={isLoading}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
                      isDangerous 
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                    }`}
                    onClick={onConfirm}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </div>
                    ) : confirmButtonText}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 px-6 py-3 text-base font-bold text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    onClick={onClose}
                  >
                    {cancelButtonText}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
