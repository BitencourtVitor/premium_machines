import React from 'react'

interface MapControlsProps {
  mapStyle: 'map' | 'satellite'
  toggleMapStyle: () => void
}

export default function MapControls({ mapStyle, toggleMapStyle }: MapControlsProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1">
        <button
          onClick={toggleMapStyle}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          {mapStyle === 'satellite' ? 'Satélite' : 'Mapa'}
        </button>
      </div>
    </div>
  )
}
