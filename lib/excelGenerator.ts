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
      'House/Building': item.construction_type === 'house'
        ? (item.lot_building_number ? `House ${item.lot_building_number}` : 'House')
        : item.construction_type === 'building' && item.lot_building_number
          ? `Building ${item.lot_building_number}`
          : '-',
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

export const generateMachineHistoryExcel = (machine: any, events: any[]) => {
  const worksheetData = events.map(event => {
    const config = getEventConfig(event.event_type)
    return {
      'Data': ['transport_start', 'transport_arrival', 'downtime_start', 'downtime_end'].includes(event.event_type) 
        ? formatWithSystemTimezone(event.event_date) 
        : formatDateOnly(event.event_date),
      'Evento': config.label,
      'Local': event.site?.title || '-',
      'House/Building': event.construction_type === 'house'
        ? (event.lot_building_number ? `House ${event.lot_building_number}` : 'House')
        : event.construction_type === 'building' && event.lot_building_number
          ? `Building ${event.lot_building_number}`
          : '-',
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
  _summaryBySupplier: unknown,
  allocations: Array<{
    unit_number: string
    supplier_name: string
    machine_type: string
    site_title: string
    site_address: string
    start_date: string
    due_date: string
    end_date: string | null
    is_ongoing?: boolean
    maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }>
    total_days?: number
    valid_days?: number
    invalid_days?: number
  }>
) => {
  const emptyRow = {
    Fornecedor: '-',
    Unidade: '-',
    Tipo: '-',
    Obra: '-',
    Endereço: '-',
    Início: '-',
    Término: '-',
    'Dias Totais': '-',
    'Dias Ativos': '-',
    'Dias Inativos (Manutenção)': '-',
    'Períodos de manutenção': '-',
  }

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
      Término: a.is_ongoing ? 'Em andamento' : a.end_date ? formatDateNoTimezone(a.end_date) : '-',
      'Dias Totais': a.total_days ?? '-',
      'Dias Ativos': a.valid_days ?? '-',
      'Dias Inativos (Manutenção)': a.invalid_days ?? '-',
      'Períodos de manutenção': periodsText || '-',
    }
  })

  const wb = XLSX.utils.book_new()

  const wsAllocations = XLSX.utils.json_to_sheet(allocationsData.length ? allocationsData : [emptyRow])

  const autoSize = (rows: any[]) => {
    return rows.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const value = String(row[key] ?? '')
        acc[i] = Math.max(acc[i] || 10, value.length + 2)
      })
      return acc
    }, [])
  }

  wsAllocations['!cols'] = autoSize(allocationsData.length ? allocationsData : [emptyRow]).map((w: number) => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, wsAllocations, 'Alocações')

  XLSX.writeFile(wb, `pagamentos_por_alocacao_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── Backcharges ────────────────────────────────────────────────────────────────

export const generateBackchargesExcel = (backcharges: any[], periodLabel: string) => {
  const wb = XLSX.utils.book_new()

  const rows = backcharges.map(b => ({
    'Data': formatDateOnly(b.event_date),
    'Máquina': b.machine?.unit_number || '—',
    'Tipo de Máquina': b.machine?.machine_type?.nome || '—',
    'Obra': b.site?.title || '—',
    'Endereço': b.site?.address || '—',
    'Subcontratados': (b.backcharge_suppliers || []).map((s: any) => s.nome || String(s)).filter(Boolean).join(', ') || '—',
    'Descrição do Problema': b.downtime_description || '—',
    'Descrição da Correção': b.correction_description || '—',
    'Notas': b.notas || '—',
    'Registrado por': b.created_by_user?.nome || '—',
    'Criado em': formatWithSystemTimezone(b.created_at),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [22, 14, 18, 30, 35, 35, 40, 40, 25, 20, 22].map(w => ({ wch: w }))

  XLSX.utils.book_append_sheet(wb, ws, 'Backcharges')
  XLSX.writeFile(wb, `backcharges_${new Date().toISOString().split('T')[0]}.xlsx`)
}

