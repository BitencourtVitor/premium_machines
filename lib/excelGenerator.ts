import * as XLSX from 'xlsx'
import { formatDateNoTimezone, formatWithSystemTimezone, formatDateOnly } from './timezone'
import { getEventConfig } from '@/app/events/utils'

export const generateAllocationStatusExcel = (data: any[]) => {
  const worksheetData = data.map(item => {
    const statusLabels: Record<string, string> = {
      'allocated': 'Alocada',
      'in_transit': 'Em Trânsito',
      'maintenance': 'Manutenção',
      'exceeded': 'Prazo Excedido'
    }

    let status = statusLabels[item.status] || item.status
    if (item.is_in_downtime) status += ' (Downtime)'

    return {
      'Unidade': item.machine_unit_number,
      'Descrição': item.machine_description || '',
      'Tipo': item.machine_type,
      'Obra': item.site_title,
      'Lote/Prédio': item.lot_building_number ? `${item.construction_type === 'lot' ? 'Lote' : 'Prédio'} ${item.lot_building_number}` : '-',
      'Status': status,
      'Início': item.allocation_start ? formatDateNoTimezone(item.allocation_start) : '-',
      'Vencimento': item.end_date ? formatDateNoTimezone(item.end_date) : '-',
      'Dias Restantes': item.days_remaining !== undefined && item.days_remaining !== null ? item.days_remaining : '-'
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(worksheetData)

  // Auto-size columns
  const maxWidths = worksheetData.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key] || '')
      acc[i] = Math.max(acc[i] || 10, value.length + 2)
    })
    return acc
  }, [])
  ws['!cols'] = maxWidths.map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, 'Status das Alocações')
  XLSX.writeFile(wb, `status_alocacoes_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const generateRentExpirationExcel = (data: any[]) => {
  const worksheetData = data.map(item => {
    const expDateStr = item.expiration_date?.split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    const isExpired = expDateStr && todayStr > expDateStr

    return {
      'Unidade': item.machine_unit_number,
      'Descrição': item.machine_description || '',
      'Tipo': item.machine_type || '',
      'Fornecedor': item.supplier?.nome || 'Próprio',
      'Obra': item.site_title || 'Sem Obra',
      'Endereço': item.site_address || '-',
      'Início': item.allocation_start ? formatDateNoTimezone(item.allocation_start) : '-',
      'Vencimento': item.expiration_date ? formatDateNoTimezone(item.expiration_date) : '-',
      'Status': isExpired ? 'Vencido' : 'Em Dia'
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(worksheetData)

  // Auto-size columns
  const maxWidths = worksheetData.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key] || '')
      acc[i] = Math.max(acc[i] || 10, value.length + 2)
    })
    return acc
  }, [])
  ws['!cols'] = maxWidths.map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, 'Vencimento de Aluguéis')
  XLSX.writeFile(wb, `vencimento_alugueis_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const generateMachineHistoryExcel = (machine: any, events: any[]) => {
  const worksheetData = events.map(event => {
    const config = getEventConfig(event.event_type)
    return {
      'Data': ['transport_start', 'transport_arrival', 'downtime_start', 'downtime_end'].includes(event.event_type) 
        ? formatWithSystemTimezone(event.event_date) 
        : formatDateOnly(event.event_date),
      'Evento': config.label,
      'Local': event.site?.title || '-',
      'Lote/Prédio': event.lot_building_number ? `${event.construction_type === 'lot' ? 'Lote' : 'Prédio'} ${event.lot_building_number}` : '-',
      'Operador': event.user?.nome || '-',
      'Status': event.status === 'approved' ? 'Aprovado' : event.status === 'pending' ? 'Pendente' : 'Rejeitado',
      'Observações': event.notas || ''
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(worksheetData)

  // Add machine info at the top if needed, but for now just the list
  const maxWidths = worksheetData.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key] || '')
      acc[i] = Math.max(acc[i] || 10, value.length + 2)
    })
    return acc
  }, [])
  ws['!cols'] = maxWidths.map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, 'Histórico')
  XLSX.writeFile(wb, `historico_${machine.unit_number}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const generateRefuelingControlExcel = (events: any[]) => {
  const worksheetData = events.map(event => ({
    'Data/Hora': formatWithSystemTimezone(event.event_date),
    'Unidade': event.machine?.unit_number || '-',
    'Tipo': event.machine?.machine_type?.nome || '-',
    'Local': event.site?.title || '-',
    'Endereço': event.site?.address || '-',
    'Operador': event.user?.nome || '-',
    'Status': event.status === 'approved' ? 'Realizado' : event.status === 'pending' ? 'Pendente' : 'Rejeitado',
    'Observações': event.notas || ''
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(worksheetData)

  const maxWidths = worksheetData.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key] || '')
      acc[i] = Math.max(acc[i] || 10, value.length + 2)
    })
    return acc
  }, [])
  ws['!cols'] = maxWidths.map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, 'Abastecimentos')
    XLSX.writeFile(wb, `controle_abastecimento_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const generateMaintenanceTimeExcel = (data: any[]) => {
    const worksheetData = data.map(item => {
        const startDate = new Date(item.start_date)
        const endDate = item.end_date ? new Date(item.end_date) : new Date()
        
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const durationText = item.is_ongoing 
            ? `${diffDays} dias (Em aberto)` 
            : `${diffDays} dias`

        return {
            'Unidade': item.machine_unit_number,
            'Tipo': item.machine_type,
            'Local': item.site_title,
            'Início': formatDateOnly(item.start_date),
            'Fim': item.end_date ? formatDateOnly(item.end_date) : '-',
            'Duração': durationText,
            'Descrição': item.description || '-',
            'Solicitante': item.user_name || '-'
        }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(worksheetData)

    const maxWidths = worksheetData.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, i) => {
            const value = String(row[key] || '')
            acc[i] = Math.max(acc[i] || 10, value.length + 2)
        })
        return acc
    }, [])
    ws['!cols'] = maxWidths.map((w: number) => ({ wch: w }))

    XLSX.utils.book_append_sheet(wb, ws, 'Manutenções')
    XLSX.writeFile(wb, `relatorio_manutencao_${new Date().toISOString().split('T')[0]}.xlsx`)
}

