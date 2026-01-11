import { Site } from '../types'
import { cleanAddress } from '../utils'

interface SiteListProps {
  sites: Site[]
  loadingSites: boolean
  showArchivedSites: boolean
  setShowArchivedSites: (show: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  showSearchDropdown: boolean
  setShowSearchDropdown: (show: boolean) => void
  loadSites: () => void
  handleOpenModal: (site?: Site) => void
  handleArchiveSite: (site: Site) => void
}

export default function SiteList({
  sites,
  loadingSites,
  showArchivedSites,
  setShowArchivedSites,
  searchQuery,
  setSearchQuery,
  showSearchDropdown,
  setShowSearchDropdown,
  loadSites,
  handleOpenModal,
  handleArchiveSite,
}: SiteListProps) {
  const filteredSites = sites.filter((site) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      site.title.toLowerCase().includes(query) ||
      site.address.toLowerCase().includes(query) ||
      (site.city && site.city.toLowerCase().includes(query)) ||
      (site.state && site.state.toLowerCase().includes(query))
    )
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden min-w-0">
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2 min-w-0">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate min-w-0 flex-1">
          {showArchivedSites ? 'Jobsites Arquivados' : 'Jobsites'} ({filteredSites.length})
        </h2>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowSearchDropdown(!showSearchDropdown)}
              className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                searchQuery.trim()
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                  : showSearchDropdown
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700'
                  : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Buscar"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {showSearchDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar jobsites..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Limpar busca"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={loadSites}
            className="p-1.5 md:p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            disabled={loadingSites}
            title="Atualizar"
          >
            {loadingSites ? (
              <svg className="w-4 h-4 md:w-5 md:h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowArchivedSites(!showArchivedSites)}
            className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
              showArchivedSites
                ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={showArchivedSites ? 'Mostrar Obras Ativas' : 'Mostrar Obras Arquivadas'}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
          {!showArchivedSites && (
            <button 
              onClick={() => handleOpenModal()}
              className="p-1.5 md:p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Novo Jobsite"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loadingSites ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Nenhum jobsite encontrado' : 'Nenhum jobsite cadastrado'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto min-w-0">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0"
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div 
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-gray-900 dark:text-white truncate">{site.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                    {cleanAddress(site.address)}
                  </p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {site.machines_count || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">máquinas</p>
                  </div>
                  <div className="text-center sm:hidden">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {site.machines_count || 0}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">máq</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenModal(site)
                    }}
                    className="p-1.5 md:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0"
                    title="Editar"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleArchiveSite(site)
                    }}
                    className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                      site.ativo
                        ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                        : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                    }`}
                    title={site.ativo ? 'Arquivar' : 'Desarquivar'}
                  >
                    {site.ativo ? (
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
