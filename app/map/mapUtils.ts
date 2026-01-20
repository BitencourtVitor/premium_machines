import mapboxgl from 'mapbox-gl'
import { Site } from './types'
import { MACHINE_STATUS_LABELS } from '@/lib/permissions'

// Função para obter cores adaptadas ao tema
export const getThemeColors = (colorType: 'neutral' | 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink', isDark: boolean) => {
  const colors: Record<string, { bg: string; text: string }> = {
    neutral: {
      bg: isDark ? '#374151' : '#6B7280', // gray-700 : gray-500
      text: '#FFFFFF'
    },
    blue: {
      bg: isDark ? '#60A5FA' : '#2563EB', // blue-400 : blue-600
      text: '#FFFFFF'
    },
    red: {
      bg: isDark ? '#F87171' : '#DC2626', // red-400 : red-600
      text: '#FFFFFF'
    },
    green: {
      bg: isDark ? '#4ADE80' : '#16A34A', // green-400 : green-600
      text: '#FFFFFF'
    },
    yellow: {
      bg: isDark ? '#FBBF24' : '#CA8A04', // yellow-400 : yellow-600
      text: '#FFFFFF'
    },
    orange: {
      bg: isDark ? '#FB923C' : '#EA580C', // orange-400 : orange-600
      text: '#FFFFFF'
    },
    purple: {
      bg: isDark ? '#A78BFA' : '#9333EA', // purple-400 : purple-600
      text: '#FFFFFF'
    },
    pink: {
      bg: isDark ? '#F472B6' : '#DB2777', // pink-400 : pink-600
      text: '#FFFFFF'
    }
  }
  return colors[colorType] || colors.neutral
}

// Função para determinar a cor do cluster baseada no status mais crítico
export const getClusterStatusColor = (sites: Site[], isDark: boolean) => {
  let hasMaintenance = false
  let hasExceeded = false
  let hasActive = false
  let hasScheduled = false
  let hasMoved = false
  let hasHistory = false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Iterar sobre todos os sites do cluster
  for (const site of sites) {
    const machines = site.all_machines || site.machines || []
    
    for (const machine of machines) {
      const startDateStr = machine.start_date ? machine.start_date.split('T')[0] : null
      const endDateStr = machine.end_date ? machine.end_date.split('T')[0] : null
      let status = machine.status

      // Se for uma extensão, o status pode vir de forma diferente
      if (machine.status === 'allocated' && startDateStr && startDateStr > todayStr) {
        status = 'scheduled'
      }

      if ((status === 'allocated' || status === 'active') && endDateStr && todayStr > endDateStr) {
        status = 'exceeded'
      }
      
      const isMoved = (status === 'inactive' || status === 'available') && 
                      machine.current_site_id && 
                      machine.current_site_id !== site.id;

      if (status === 'maintenance') {
        hasMaintenance = true
      } else if (status === 'exceeded') {
        hasExceeded = true
      } else if (status === 'allocated' || status === 'active') {
        hasActive = true
      } else if (status === 'scheduled') {
        hasScheduled = true
      } else if (isMoved) {
        hasMoved = true
      } else if (status === 'inactive') {
        hasHistory = true
      }
    }
  }

  // Definir cor baseada na prioridade: Manutenção > Excedida > Ativa > Agendada > Movida > Histórico > Nunca
  if (hasMaintenance) {
    return getThemeColors('orange', isDark) // Crítico: Manutenção
  } else if (hasExceeded) {
    return getThemeColors('red', isDark) // Crítico: Excedida
  } else if (hasActive) {
    return getThemeColors('green', isDark) // Ativa: Em operação
  } else if (hasScheduled) {
    return getThemeColors('blue', isDark) // Agendada: Futura
  } else if (hasMoved) {
    return getThemeColors('pink', isDark) // Movida: Saiu da obra
  } else if (hasHistory) {
    return getThemeColors('purple', isDark) // Histórico: Já teve algo
  } else {
    return getThemeColors('neutral', isDark) // Nunca houve: Vazio
  }
}

// Função para calcular distância geográfica entre dois pontos (em metros)
export const getGeoDistance = (lng1: number, lat1: number, lng2: number, lat2: number) => {
  const R = 6371000 // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Função para agrupar sites próximos baseado na distância visual (pixels) na tela
export const groupNearbySites = (sites: Site[], mapInstance: mapboxgl.Map, thresholdPixels: number = 80) => {
  const groups: { center: { lng: number; lat: number }; sites: Site[]; id: string }[] = []
  const processed = new Set<string>()

  // Verificar se o mapa está pronto para projeções
  if (!mapInstance || !mapInstance.isStyleLoaded()) {
    // Se o mapa não está pronto, retornar cada site como grupo individual
    return sites.map(site => ({
      center: { lng: Number(site.longitude), lat: Number(site.latitude) },
      sites: [site],
      id: site.id
    }))
  }

  sites.forEach(site => {
    if (processed.has(site.id)) return

    const group: Site[] = [site]
    processed.add(site.id)

    try {
      // Converter coordenadas do site atual para pixels
      const sitePoint = mapInstance.project([Number(site.longitude), Number(site.latitude)])
      
      // Verificar se a projeção é válida (não está fora da tela ou inválida)
      if (!sitePoint || !isFinite(sitePoint.x) || !isFinite(sitePoint.y)) {
        // Se a projeção falhou, criar grupo individual
        const centerLng = Number(site.longitude)
        const centerLat = Number(site.latitude)
        groups.push({
          center: { lng: centerLng, lat: centerLat },
          sites: group,
          id: site.id
        })
        return
      }

      sites.forEach(otherSite => {
        if (processed.has(otherSite.id)) return
        
        try {
          // Converter coordenadas do outro site para pixels
          const otherSitePoint = mapInstance.project([Number(otherSite.longitude), Number(otherSite.latitude)])
          
          // Verificar se a projeção é válida
          if (!otherSitePoint || !isFinite(otherSitePoint.x) || !isFinite(otherSitePoint.y)) {
            return // Pular este site se a projeção falhou
          }
          
          // Calcular distância em pixels na tela
          const dx = otherSitePoint.x - sitePoint.x
          const dy = otherSitePoint.y - sitePoint.y
          const pixelDistance = Math.sqrt(dx * dx + dy * dy)

          // Sites dentro do threshold em pixels serão agrupados
          if (pixelDistance < thresholdPixels) {
            group.push(otherSite)
            processed.add(otherSite.id)
          }
        } catch (error) {
          console.warn('Erro ao projetar coordenadas do site:', otherSite.id, error)
        }
      })
    } catch (error) {
      console.warn('Erro ao projetar coordenadas do site:', site.id, error)
    }

    // Calcular centro do grupo
    const centerLng = group.reduce((sum, s) => sum + Number(s.longitude), 0) / group.length
    const centerLat = group.reduce((sum, s) => sum + Number(s.latitude), 0) / group.length

    groups.push({
      center: { lng: centerLng, lat: centerLat },
      sites: group,
      id: group.map(s => s.id).sort().join('-')
    })
  })

  return groups
}

// Criar marcador com ícone map-pin do Phosphor Icons para jobsites individuais
export const createLocationMarker = (site: Site, currentIsDark: boolean, onClick: (e?: Event) => void, isSelected: boolean = false) => {
  const machines = site.all_machines || site.machines || []
  // Determine status flags
  let hasActive = false
  let hasExceeded = false
  let hasMaintenance = false
  let hasScheduled = false
  let hasMoved = false
  let hasHistory = false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  machines.forEach((machine: any) => {
    const startDateStr = machine.start_date ? machine.start_date.split('T')[0] : null
    const endDateStr = machine.end_date ? machine.end_date.split('T')[0] : null
    let status = machine.status

    if (status === 'allocated' && startDateStr && startDateStr > todayStr) {
      status = 'scheduled'
    }

    if ((status === 'allocated' || status === 'active') && endDateStr && todayStr > endDateStr) {
      status = 'exceeded'
    }

    const isMoved = (status === 'inactive' || status === 'available') && 
                    machine.current_site_id && 
                    machine.current_site_id !== site.id;

    if (status === 'maintenance') hasMaintenance = true
    else if (status === 'exceeded') hasExceeded = true
    else if (status === 'allocated' || status === 'active') hasActive = true
    else if (status === 'scheduled') hasScheduled = true
    else if (isMoved) hasMoved = true
    else if (status === 'inactive') hasHistory = true
  })

  let baseColorType: 'neutral' | 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' = 'neutral'
  
  // Prioridade: Manutenção > Excedida > Ativa > Agendada > Movida > Histórico > Nunca
  if (hasMaintenance) {
    baseColorType = 'orange'
  } else if (hasExceeded) {
    baseColorType = 'red'
  } else if (hasActive) {
    baseColorType = 'green'
  } else if (hasScheduled) {
    baseColorType = 'blue'
  } else if (hasMoved) {
    baseColorType = 'pink'
  } else if (hasHistory) {
    baseColorType = 'purple'
  } else {
    baseColorType = 'neutral'
  }
  
  const colors = getThemeColors(baseColorType, currentIsDark)
  const strokeWidth = isSelected ? 16 : 8
  const el = document.createElement('div')
  el.className = 'marker-container'
  el.style.cursor = 'pointer'
  el.style.width = '32px'
  el.style.height = '40px'
  // Reduzir z-index para não sobrepor os controles do mapa (que usam z-10 ou superior)
  el.style.zIndex = isSelected ? '5' : '1'
  el.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <svg width="32" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); overflow: visible;">
        <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" fill="${colors.bg}" stroke="white" stroke-width="${strokeWidth}"/>
      </svg>
    </div>
  `

  el.addEventListener('click', onClick as EventListener)
  return el
}

// Criar painel separado para exibir informações do site
export const createSitePanel = (site: Site, currentIsDark: boolean) => {
  const el = document.createElement('div')
  el.className = 'site-panel'
  el.style.width = '280px'
  el.style.zIndex = '9999'
  el.style.pointerEvents = 'auto'
  el.innerHTML = `
    <div style="background: ${currentIsDark ? '#1f2937' : 'white'}; border: 1px solid ${currentIsDark ? '#374151' : '#d1d5db'}; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${site.is_headquarters ? '<svg style="width: 16px; height: 16px; color: #6b7280;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>' : ''}
          <h3 style="font-weight: 600; font-size: 14px; color: ${currentIsDark ? 'white' : '#111827'};">
            ${site.title}
          </h3>
          ${site.is_headquarters ? '<span style="font-size: 10px; padding: 2px 6px; background: #e5e7eb; color: #374151; border-radius: 4px; font-weight: 500;">Sede</span>' : ''}
        </div>
        <button onclick="event.stopPropagation(); window.dispatchEvent(new CustomEvent('closeSitePanel', { detail: '${site.id}' }));" style="padding: 2px; border-radius: 4px; color: #6b7280; cursor: pointer;">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p style="font-size: 12px; color: ${currentIsDark ? '#9ca3af' : '#6b7280'}; margin-bottom: 12px;">
        ${site.address || site.city || 'Localização não disponível'}
      </p>

      ${!site.is_headquarters ? `
        <div style="border-top: 1px solid ${currentIsDark ? '#374151' : '#e5e7eb'}; padding-top: 12px;">
          <p style="font-size: 12px; font-weight: 500; color: ${currentIsDark ? '#d1d5db' : '#374151'}; margin-bottom: 8px;">
            ${(() => {
              const machines = site.all_machines || site.machines || [];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().split('T')[0];
              
              const workingCount = machines.filter((m: any) => {
                const startDateStr = m.start_date ? m.start_date.split('T')[0] : null;
                const endDateStr = m.end_date ? m.end_date.split('T')[0] : null;
                
                let finalStatus = m.status;
                if (finalStatus === 'allocated' && startDateStr && startDateStr > todayStr) {
                  finalStatus = 'scheduled';
                }
                if ((finalStatus === 'allocated' || finalStatus === 'active') && endDateStr && todayStr > endDateStr) {
                  finalStatus = 'exceeded';
                }
                
                return finalStatus === 'allocated' || finalStatus === 'active' || finalStatus === 'exceeded';
              }).length;
              
              return `Equipamentos (${workingCount} ativos de ${machines.length})`;
            })()}
          </p>
          ${(site.all_machines?.length || site.machines?.length) > 0 ? `
            <div style="max-height: 120px; overflow-y: auto; gap: 4px; display: flex; flex-direction: column;">
              ${(site.all_machines || site.machines).map((machine: any) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];
                
                const startDateStr = machine.start_date ? machine.start_date.split('T')[0] : null;
                const endDateStr = machine.end_date ? machine.end_date.split('T')[0] : null;

                // Prioridade para o status vindo da API, mas validamos com a data se necessário
                let finalStatus = machine.status;
                
                // No dia do fim da alocação, ela ainda é considerada ativa
                // A regra de 'dia seguinte' do stateCalculation já deve vir tratada da API,
                // mas garantimos a consistência visual aqui.
                if (finalStatus === 'allocated' && startDateStr && startDateStr > todayStr) {
                  finalStatus = 'scheduled';
                }

                if ((finalStatus === 'allocated' || finalStatus === 'active') && endDateStr && todayStr > endDateStr) {
                  finalStatus = 'exceeded';
                }

                let label = 'Encerrada';
                let statusColor = '';

                const isMoved = (finalStatus === 'inactive' || finalStatus === 'available') && 
                                machine.current_site_id && 
                                machine.current_site_id !== site.id;

                if (isMoved) {
                  label = 'MOVIDA';
                  statusColor = `background: ${currentIsDark ? '#831843' : '#fce7f3'}; color: ${currentIsDark ? '#f9a8d4' : '#9d174d'}; border: 1px solid ${currentIsDark ? '#db2777' : '#fbcfe8'}; font-weight: 700;`;
                } else if (finalStatus === 'allocated' || finalStatus === 'active') {
                  label = 'Ativa';
                  statusColor = `background: ${currentIsDark ? '#064e3b' : '#dcfce7'}; color: ${currentIsDark ? '#6ee7b7' : '#166534'};`;
                } else if (finalStatus === 'exceeded') {
                  label = 'Ativa (Excedida)';
                  statusColor = `background: ${currentIsDark ? '#7f1d1d' : '#fee2e2'}; color: ${currentIsDark ? '#fca5a5' : '#991b1b'}; font-weight: 700; border: 1px solid ${currentIsDark ? '#f87171' : '#fecaca'};`;
                } else if (finalStatus === 'maintenance') {
                  label = 'Manutenção';
                  statusColor = `background: ${currentIsDark ? '#7f1d1d' : '#fee2e2'}; color: ${currentIsDark ? '#fca5a5' : '#991b1b'};`;
                } else if (finalStatus === 'scheduled') {
                  label = 'Agendada';
                  statusColor = `background: ${currentIsDark ? '#1e3a8a' : '#dbeafe'}; color: ${currentIsDark ? '#93c5fd' : '#1e40af'};`;
                } else if (finalStatus === 'available' || finalStatus === 'inactive') {
                  // Se for na sede, é "Disponível", se for em obra é "Encerrada"
                  label = site.is_headquarters ? 'Disponível' : 'Encerrada';
                  statusColor = site.is_headquarters 
                    ? `background: ${currentIsDark ? '#1e3a8a' : '#dbeafe'}; color: ${currentIsDark ? '#93c5fd' : '#1e40af'};`
                    : `background: ${currentIsDark ? '#4c1d95' : '#f3e8ff'}; color: ${currentIsDark ? '#c4b5fd' : '#6d28d9'};`;
                } else {
                  label = 'Encerrada';
                  statusColor = `background: ${currentIsDark ? '#4c1d95' : '#f3e8ff'}; color: ${currentIsDark ? '#c4b5fd' : '#6d28d9'};`;
                }

                return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px; background: ${currentIsDark ? '#374151' : '#f9fafb'}; border-radius: 4px;">
                  <span style="font-size: 12px; font-weight: 500; color: ${currentIsDark ? 'white' : '#111827'};">
                    ${machine.unit_number}
                  </span>
                  <span style="
                    font-size: 10px; 
                    padding: 2px 8px; 
                    border-radius: 9999px; 
                    font-weight: 600;
                    text-transform: uppercase;
                    ${statusColor}
                  ">
                    ${label}
                  </span>
                </div>`;
              }).join('')}
            </div>
          ` : `
            <p style="font-size: 12px; color: ${currentIsDark ? '#9ca3af' : '#6b7280'};">
              Nenhuma máquina alocada
            </p>
          `}
          <div style="margin-top: 8px; width: 100%; padding: 6px; background: ${currentIsDark ? '#374151' : '#f3f4f6'}; color: ${currentIsDark ? '#9ca3af' : '#6b7280'}; border-radius: 6px; font-size: 12px; font-weight: 500; text-align: center; cursor: pointer;" onclick="event.stopPropagation(); window.dispatchEvent(new CustomEvent('openSiteDetails', { detail: '${site.id}' }));">
            Ver Detalhes
          </div>
        </div>
      ` : `
        <div style="border-top: 1px solid ${currentIsDark ? '#374151' : '#e5e7eb'}; padding-top: 12px;">
          <p style="font-size: 12px; color: ${currentIsDark ? '#9ca3af' : '#6b7280'}; font-style: italic;">
            Esta é a sede da empresa Premium Group Inc.
          </p>
        </div>
      `}
    </div>
  `
  return el
}

// spiderfy-specific marker creators removidos
