'use client'

import React, { useState, useEffect } from 'react'
import CustomInput from './CustomInput'
import PinInput from './PinInput'
import CustomDropdown from './CustomDropdown'
import { getSessionUser, setSessionUser } from '@/lib/session'
import { TIMEZONE_OPTIONS } from '@/lib/timezone'
import { LuUser, LuClock, LuX, LuSave } from 'react-icons/lu'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'perfil' | 'timezone'

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('perfil')
  const [user, setUser] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [pin, setPin] = useState('')
  const [timezone, setTimezone] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const sessionUser = getSessionUser()
      if (sessionUser) {
        setUser(sessionUser)
        setNome(sessionUser.nome)
        const savedTimezone = localStorage.getItem('system_timezone') || '0'
        setTimezone(savedTimezone)
      }
      setSuccess(null)
      setError(null)
      setActiveTab('perfil')
    }
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (activeTab === 'perfil') {
        const response = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome,
            pin: pin || undefined,
            currentUserId: user.id,
            currentUserRole: user.role,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setSuccess('Perfil atualizado com sucesso!')
          const updatedUser = { ...user, nome }
          setSessionUser(updatedUser)
          setUser(updatedUser)
          setPin('')
        } else {
          setError(data.error || 'Erro ao atualizar perfil')
        }
      } else if (activeTab === 'timezone') {
        localStorage.setItem('system_timezone', timezone)
        setSuccess('Fuso horário atualizado com sucesso!')
        window.dispatchEvent(new CustomEvent('timezoneChange', { detail: { timezone } }))
      }
    } catch (err) {
      setError('Erro de conexão com o servidor')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const menuItems = [
    { id: 'perfil', label: 'Meu Perfil', icon: LuUser },
    { id: 'timezone', label: 'Fuso Horário', icon: LuClock },
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 md:p-6 z-[10010]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header - Centralized Title */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-center relative bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h2>
          <button
            onClick={onClose}
            className="absolute right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Fechar"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-16 md:w-56 flex-shrink-0 border-r border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 p-2 md:p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as SettingsTab)
                    setError(null)
                    setSuccess(null)
                  }}
                  className={`
                    w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={item.label}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-10">
            <div className="w-full max-w-2xl mx-auto space-y-6 md:space-y-8">
              {activeTab === 'perfil' && (
                <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Informações Pessoais</h3>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Gerencie seus dados de acesso ao sistema.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                      <CustomInput
                        label="Nome Completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome"
                        className="h-11 md:h-12"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Alterar Senha (PIN de 6 dígitos)
                      </label>
                      <div className="flex justify-center md:justify-start">
                        <PinInput
                          length={6}
                          onComplete={(value) => setPin(value)}
                          disabled={saving}
                        />
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <strong>Dica:</strong> Deixe em branco para manter sua senha atual.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'timezone' && (
                <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Preferências do Sistema</h3>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Configure como os horários serão exibidos para você.</p>
                  </div>

                  <div className="space-y-8 md:space-y-10">
                    <CustomDropdown
                      label="Fuso Horário Preferencial"
                      value={timezone}
                      onChange={setTimezone}
                      options={TIMEZONE_OPTIONS}
                      searchable={true}
                      placeholder="Selecione um fuso horário"
                      className="h-11 md:h-12"
                    />
                    <div className="p-4 md:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                      <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        <span className="font-bold block mb-1">Nota Importante:</span>
                        O banco de dados armazena todas as informações em GMT 0. 
                        Esta configuração ajusta apenas a visualização para o seu horário local, facilitando o acompanhamento dos eventos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              <div className="min-h-[48px] flex items-end">
                {error && (
                  <div className="w-full p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm md:text-base text-red-700 dark:text-red-300 animate-in shake-in duration-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="w-full p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-sm md:text-base text-green-700 dark:text-green-300 animate-in fade-in duration-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {success}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200
              ${saving 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20'
              }
            `}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LuSave className="w-5 h-5" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
