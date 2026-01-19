import { Site, GeocodingResult } from '../types'
import { cleanAddress } from '../utils'
import LocationPickerMap from './LocationPickerMap'

interface CreateSiteModalProps {
  showCreateModal: boolean
  editingSite: Site | null
  newSite: {
    title: string
    address: string
  }
  setNewSite: (site: { title: string; address: string }) => void
  handleCloseModal: () => void
  handleCreateSite: () => void
  creating: boolean
  geocoding: boolean
  handleGeocode: () => void
  geocodingResult: GeocodingResult | null
  setGeocodingResult: (result: GeocodingResult | null) => void
  mapCoordinates: { lat: number; lng: number } | null
  setMapCoordinates: (coords: { lat: number; lng: number } | null) => void
  error?: string | null
}

export default function CreateSiteModal({
  showCreateModal,
  editingSite,
  newSite,
  setNewSite,
  handleCloseModal,
  handleCreateSite,
  creating,
  geocoding,
  handleGeocode,
  geocodingResult,
  setGeocodingResult,
  mapCoordinates,
  setMapCoordinates,
  error,
}: CreateSiteModalProps) {
  if (!showCreateModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010] p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl my-4 md:my-8 min-w-0 max-w-[calc(100vw-3rem)] md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingSite ? 'Editar Jobsite' : 'Novo Jobsite'}
          </h2>
          <button
            onClick={handleCloseModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Jobsite
            </label>
            <input
              type="text"
              value={newSite.title}
              onChange={(e) => setNewSite({ ...newSite, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ex: Jobsite Residencial Alpha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endereço
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSite.address}
                onChange={(e) => {
                  setNewSite({ ...newSite, address: e.target.value })
                  setGeocodingResult(null)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Rua, número, bairro, cidade"
              />
              <button
                onClick={handleGeocode}
                disabled={geocoding || !newSite.address}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
              >
                {geocoding ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {geocodingResult && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                    Endereço encontrado
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {cleanAddress(geocodingResult.formatted_address)}
                  </p>
                  {mapCoordinates && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      <span className="font-medium">Coordenadas:</span> {mapCoordinates.lat.toFixed(6)}, {mapCoordinates.lng.toFixed(6)}
                    </p>
                  )}
                  <p className="text-xs text-green-500 dark:text-green-500 mt-1">
                    Confiança: {Math.round((geocodingResult.confidence || 0) * 100)}%
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Arraste o pin no mapa abaixo para ajustar a localização
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mapa para confirmação de localização */}
          {mapCoordinates && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirme a localização no mapa
              </label>
              <LocationPickerMap
                mapCoordinates={mapCoordinates}
                setMapCoordinates={setMapCoordinates}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCloseModal}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateSite}
            disabled={creating || !newSite.title || !mapCoordinates}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!mapCoordinates ? 'É necessário geocodificar o endereço e confirmar a localização no mapa antes de salvar' : ''}
          >
            {creating ? (editingSite ? 'Salvando...' : 'Criando...') : (editingSite ? 'Salvar Alterações' : 'Criar Jobsite')}
          </button>
        </div>
      </div>
    </div>
  )
}
