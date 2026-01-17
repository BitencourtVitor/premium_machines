import { Site } from '../types'
import { cleanAddress } from '../utils'
import BaseList from '../../components/BaseList'
import ListActionButton from '../../components/ListActionButton'

interface SiteListProps {
  sites: Site[]
  loadingSites: boolean
  showArchivedSites: boolean
  setShowArchivedSites: (show: boolean) => void
  loadSites: () => void
  handleOpenModal: (site?: Site) => void
  handleArchiveSite: (site: Site) => void
}

export default function SiteList({
  sites,
  loadingSites,
  showArchivedSites,
  setShowArchivedSites,
  loadSites,
  handleOpenModal,
  handleArchiveSite,
}: SiteListProps) {
  return (
    <BaseList
      title="Jobsites"
      items={sites}
      loading={loadingSites}
      showSearch={true}
      searchFields={['title', 'address', 'city', 'state']}
      searchPlaceholder="Buscar jobsites..."
      showRefresh={true}
      onRefresh={loadSites}
      showArchive={true}
      onArchive={() => setShowArchivedSites(!showArchivedSites)}
      isArchivedView={showArchivedSites}
      showAdd={!showArchivedSites}
      onAdd={() => handleOpenModal()}
      renderItem={(site) => (
        <div className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0">
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
              <ListActionButton
                icon="edit"
                onClick={() => handleOpenModal(site)}
                variant="blue"
                title="Editar"
                className="p-1.5 md:p-2"
              />
              <ListActionButton
                icon={site.ativo ? "archive" : "unarchive"}
                onClick={() => handleArchiveSite(site)}
                variant={site.ativo ? "orange" : "green"}
                title={site.ativo ? "Arquivar" : "Desarquivar"}
                className="p-1.5 md:p-2"
              />
            </div>
          </div>
        </div>
      )}
    />
  )
}
