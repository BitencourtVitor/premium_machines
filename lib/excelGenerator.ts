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

export const generateAllocationCreditsExcel = (
  summaryBySupplier: Array<{
    supplier_id: string
    supplier_name: string
    machine_types: Array<{ machine_type: string; credit_days: number; base_credit_days: number; maintenance_credit_days: number }>
  }>,
  allocations: Array<{
    unit_number: string
    supplier_name: string
    machine_type: string
    site_title: string
    site_address: string
    start_date: string
    due_date: string
    end_date: string
    base_credit_days: number
    maintenance_credit_days: number
    maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }>
    credit_days: number
  }>
) => {
  const summaryData = (summaryBySupplier || []).flatMap(supplier => {
    const supplierName = supplier.supplier_name || 'Fornecedor desconhecido'
    const types = supplier.machine_types || []
    if (!types.length) {
      return [
        {
          Fornecedor: supplierName,
          'Tipo de máquina': '-',
          'Crédito base (dias)': 0,
          'Crédito manutenção (dias)': 0,
          'Crédito total (dias)': 0,
        },
      ]
    }
    return types.map(t => ({
      Fornecedor: supplierName,
      'Tipo de máquina': t.machine_type,
      'Crédito base (dias)': t.base_credit_days,
      'Crédito manutenção (dias)': t.maintenance_credit_days,
      'Crédito total (dias)': t.credit_days,
    }))
  })

  const allocationsData = (allocations || []).map(a => {
    const periodsText = (a.maintenance_periods || [])
      .map(p => `${formatDateNoTimezone(p.start_date)}–${formatDateNoTimezone(p.end_date)} (${p.days}d)`)
      .join('; ')

    return {
      Fornecedor: a.supplier_name || 'Fornecedor desconhecido',
      Unidade: a.unit_number,
      Tipo: a.machine_type,
      Obra: a.site_title,
      Endereço: a.site_address,
      Início: a.start_date ? formatDateNoTimezone(a.start_date) : '-',
      Vencimento: a.due_date ? formatDateNoTimezone(a.due_date) : '-',
      Término: a.end_date ? formatDateNoTimezone(a.end_date) : '-',
      'Crédito base (dias)': a.base_credit_days,
      'Crédito manutenção (dias)': a.maintenance_credit_days,
      'Crédito total (dias)': a.credit_days,
      'Períodos de manutenção': periodsText || '-',
    }
  })

  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.json_to_sheet(
    summaryData.length
      ? summaryData
      : [
          {
            Fornecedor: '-',
            'Tipo de máquina': '-',
            'Crédito base (dias)': '-',
            'Crédito manutenção (dias)': '-',
            'Crédito total (dias)': '-',
          },
        ]
  )
  const wsAllocations = XLSX.utils.json_to_sheet(
    allocationsData.length
      ? allocationsData
      : [
          {
            Fornecedor: '-',
            Unidade: '-',
            Tipo: '-',
            Obra: '-',
            Endereço: '-',
            Início: '-',
            Vencimento: '-',
            Término: '-',
            'Crédito base (dias)': '-',
            'Crédito manutenção (dias)': '-',
            'Crédito total (dias)': '-',
            'Períodos de manutenção': '-',
          },
        ]
  )

  const autoSize = (rows: any[]) => {
    return rows.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const value = String(row[key] ?? '')
        acc[i] = Math.max(acc[i] || 10, value.length + 2)
      })
      return acc
    }, [])
  }

  wsSummary['!cols'] = autoSize(
    summaryData.length
      ? summaryData
      : [
          {
            Fornecedor: '-',
            'Tipo de máquina': '-',
            'Crédito base (dias)': '-',
            'Crédito manutenção (dias)': '-',
            'Crédito total (dias)': '-',
          },
        ]
  ).map(
    (w: number) => ({ wch: w })
  )
  wsAllocations['!cols'] = autoSize(
    allocationsData.length
      ? allocationsData
      : [
          {
            Fornecedor: '-',
            Unidade: '-',
            Tipo: '-',
            Obra: '-',
            Endereço: '-',
            Início: '-',
            Vencimento: '-',
            Término: '-',
            'Crédito base (dias)': '-',
            'Crédito manutenção (dias)': '-',
            'Crédito total (dias)': '-',
            'Períodos de manutenção': '-',
          },
        ]
  ).map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo')
  XLSX.utils.book_append_sheet(wb, wsAllocations, 'Alocações')

  XLSX.writeFile(wb, `creditos_alocacao_${new Date().toISOString().split('T')[0]}.xlsx`)
}

