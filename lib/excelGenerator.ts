import * as XLSX from 'xlsx'
import { formatDateNoTimezone } from './timezone'

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

    // Calculate days for specific statuses
    const today = new Date(new Date().toISOString().split('T')[0])
    
    if (item.status === 'exceeded' && item.end_date) {
      const expDate = new Date(item.end_date.split('T')[0])
      const diffTime = Math.abs(today.getTime() - expDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      status += ` (${diffDays} dias)`
    } else if ((item.status === 'in_transit' || item.status === 'maintenance') && item.allocation_start) {
      const startDate = new Date(item.allocation_start.split('T')[0])
      const diffTime = Math.abs(today.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      status += ` (${diffDays} dias)`
    }

    return {
      'Unidade': item.machine_unit_number,
      'Descrição': item.machine_description || '',
      'Tipo': item.machine_type,
      'Obra': item.site_title,
      'Lote/Prédio': item.lot_building_number || '-',
      'Status': status,
      'Início': item.allocation_start ? formatDateNoTimezone(item.allocation_start) : '-',
      'Vencimento': item.end_date ? formatDateNoTimezone(item.end_date) : '-'
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
