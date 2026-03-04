import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { adjustDateToSystemTimezone, formatDateOnly, formatDateNoTimezone, formatWithSystemTimezone } from '@/lib/timezone'
import { getEventConfig } from '@/app/events/utils'
import { getMachineStatusLabel } from '@/lib/permissions'

interface AllocationData {
  machine_unit_number: string
  machine_description: string
  machine_type: string
  site_title: string
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  status: string
  is_in_downtime: boolean
  attached_extensions: any[]
  end_date?: string | null
  allocation_start?: string | null
  ownership_type?: string
  days_remaining?: number | null
}

interface RentExpirationData {
  machine_unit_number: string
  machine_description: string
  machine_type: string
  site_title: string
  site_address: string
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  allocation_start: string
  expiration_date: string | null
  billing_type: string
  status: string
}

interface RefuelingControlData {
  events: any[]
  templates: any[]
  period: { start: string, end: string }
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      const dataURL = canvas.toDataURL('image/png')
      resolve(dataURL)
    }
    img.onerror = (error) => reject(error)
    img.src = url
  })
}

const drawHeader = async (doc: any, margin: number) => {
  try {
    const logoBase64 = await getBase64ImageFromURL('/premium_logo_vetorizado.png')
    doc.addImage(logoBase64, 'PNG', margin, 12, 10, 10)
    
    // Vertical separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin + 13, 12, margin + 13, 22)
    
    // "Machines" text
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(16)
    doc.setTextColor(60, 60, 60)
    doc.text('Machines', margin + 16, 19)
  } catch (error) {
    console.error('Error loading logo:', error)
    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text('Premium Machines', margin, 20)
  }
}

export const generateAllocationStatusPDF = async (data: AllocationData[], periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Status das Alocações', margin, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)

  let currentY = 60

  const getStatusInfo = (status: string, is_in_downtime: boolean, ownership_type?: string) => {
    if (is_in_downtime) {
      return { label: 'Em Manutenção', color: [234, 88, 12] } // Orange
    }
    
    const label = getMachineStatusLabel(status, ownership_type);
    
    if (status === 'available' && ownership_type === 'rented') {
      return { label: label || 'Devolvida', color: [107, 114, 128] } // Gray
    }

    switch (status) {
      case 'allocated': 
        return { label: label || 'Ativa', color: [22, 163, 74] } // Green
      case 'in_transit': 
        return { label: label || 'Em Transporte', color: [147, 51, 234] } // Purple
      case 'maintenance': 
        return { label: label || 'Em Manutenção', color: [234, 88, 12] } // Orange
      case 'exceeded': 
        return { label: label || 'Ativa - Prazo Excedido', color: [220, 38, 38] } // Red
      case 'available': 
        return { label: label || 'Disponível', color: [22, 163, 74] } // Green
      case 'inactive': 
        return { label: label || 'Inativa', color: [100, 100, 100] } // Gray
      default: 
        return { label: label || status, color: [100, 100, 100] }
    }
  }

  // Group data by site and then by lot/building
  const groupedBySite = new Map<string, Map<string, AllocationData[]>>()
  
  data.forEach(item => {
    const site = item.site_title || 'Sem Localização'
    const lot = item.lot_building_number 
      ? `${item.construction_type === 'lot' ? 'Lote' : 'Prédio'} ${item.lot_building_number}`
      : 'Geral / Sem Lote'
      
    if (!groupedBySite.has(site)) {
      groupedBySite.set(site, new Map<string, AllocationData[]>())
    }
    
    const siteMap = groupedBySite.get(site)!
    if (!siteMap.has(lot)) {
      siteMap.set(lot, [])
    }
    siteMap.get(lot)!.push(item)
  })

  // Iterate over Sites
  groupedBySite.forEach((lotsMap, siteTitle) => {
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    // 1. Site Header (Level 1)
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, currentY - 5, pageWidth - margin * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(siteTitle.toUpperCase(), margin + 2, currentY)
    currentY += 10

    // Iterate over Lots (Level 2)
    lotsMap.forEach((machines, lotLabel) => {
      if (currentY > 260) {
        doc.addPage()
        currentY = 20
      }

      // Lot Header
      doc.setFillColor(248, 248, 248)
      doc.rect(margin + 5, currentY - 5, pageWidth - margin * 2 - 5, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(lotLabel, margin + 7, currentY)
      currentY += 8

      // Iterate over Machines (Level 3)
      machines.forEach((item) => {
        if (currentY > 260) {
          doc.addPage()
          currentY = 20
        }

        // 1. Machine Title (Left)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(30)
        const machineTitle = `${item.machine_unit_number} - ${item.machine_description || item.machine_type}`
        doc.text(machineTitle, margin + 10, currentY)

        // 2. Data Containers (Chips) - Right Aligned
        const statusInfo = getStatusInfo(item.status, item.is_in_downtime, item.ownership_type)
        
        // Chip data collector
        interface ChipData {
          text: string;
          color: number[];
        }
        const chips: ChipData[] = []
        
        // Status
        chips.push({ text: statusInfo.label, color: statusInfo.color })
        
        // Expiration/Days
        if (item.end_date) {
          const expDateFormatted = formatDateNoTimezone(item.end_date)
          const days = item.days_remaining
          chips.push({ text: `Vence ${expDateFormatted}`, color: [100, 100, 100] })
          
          if (days !== undefined && days !== null) {
            if (days < 0) {
              chips.push({ text: `Vencido há ${Math.abs(days)} dias`, color: [220, 38, 38] })
            } else {
              chips.push({ text: `${days} dias restantes`, color: [22, 163, 74] })
            }
          }
        } else if ((item.status === 'in_transit' || item.status === 'maintenance') && item.allocation_start) {
          const today = new Date(new Date().toISOString().split('T')[0])
          const startDate = new Date(item.allocation_start.split('T')[0])
          const diffTime = Math.abs(today.getTime() - startDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          chips.push({ text: `${diffDays} dias no estado`, color: [100, 100, 100] })
        }

        // Chip Drawing Function
        const getChipWidth = (text: string) => {
          doc.setFontSize(7.5)
          return doc.getTextWidth(text) + 8 // textWidth + 2*hPadding
        }

        const drawChip = (text: string, color: number[], x: number, y: number) => {
          doc.setFontSize(7.5)
          const textWidth = doc.getTextWidth(text)
          const hPadding = 4
          const chipWidth = textWidth + (hPadding * 2)
          const chipHeight = 4.5 // Reduced height for better fit
          
          const pastelBG = [
            Math.floor(color[0] + (255 - color[0]) * 0.9),
            Math.floor(color[1] + (255 - color[1]) * 0.9),
            Math.floor(color[2] + (255 - color[2]) * 0.9)
          ]
          
          // Y adjustment for centering text: 
          // text usually sits on baseline, we need to offset the rect
          const rectY = y - 3.2 
          
          doc.setFillColor(pastelBG[0], pastelBG[1], pastelBG[2])
          doc.roundedRect(x, rectY, chipWidth, chipHeight, 1, 1, 'F')
          
          doc.setDrawColor(color[0], color[1], color[2])
          doc.setLineWidth(0.1)
          doc.roundedRect(x, rectY, chipWidth, chipHeight, 1, 1, 'S')
          
          doc.setTextColor(color[0], color[1], color[2])
          // Text is drawn at y, which is the baseline. 
          // With rectY at y-3.2 and height 4.5, text is better centered.
          doc.text(text, x + hPadding, y)
          
          return chipWidth
        }

        // Calculate total width of all chips
        const gap = 2
        let totalWidth = chips.reduce((acc, chip) => acc + getChipWidth(chip.text), 0) + (chips.length - 1) * gap
        
        // Draw chips starting from the right
        let currentX = pageWidth - margin - totalWidth
        chips.forEach((chip) => {
          const width = drawChip(chip.text, chip.color, currentX, currentY)
          currentX += width + gap
        })

        currentY += 6 // Reduced from 8 to make it more compact

        // Extensions
        if (item.attached_extensions && item.attached_extensions.length > 0) {
          item.attached_extensions.forEach((ext: any) => {
            doc.setFontSize(8)
            doc.setTextColor(140, 140, 140)
            doc.text(`   + Extensão: ${ext.extension_unit_number} (${ext.extension_type})`, margin + 10, currentY)
            currentY += 4
          })
        }

        currentY += 2 // Reduced from 4 to make it more compact
        // Thin separator between machines
        doc.setDrawColor(245)
        doc.line(margin + 10, currentY - 1, pageWidth - margin, currentY - 1)
        currentY += 3 // Reduced from 4 to make it more compact
      })

      currentY += 4 // Space after each lot group
    })

    currentY += 5 // Space after each site group
  })

  doc.save(`relatorio_alocacoes_${new Date().getTime()}.pdf`)
}

export const generateRentExpirationPDF = async (data: RentExpirationData[], periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Relatório de Vencimento de Aluguéis', margin, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)

  let currentY = 60

  data.forEach((item, index) => {
    if (currentY > 260) {
      doc.addPage()
      currentY = 20
    }

    // Title: Machine
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30)
    const machineTitle = `${item.machine_unit_number} - ${item.machine_description || item.machine_type}`
    doc.text(machineTitle, margin, currentY)

    // Expiration Date (Opposite side)
    if (item.expiration_date) {
      const expDateStr = item.expiration_date?.split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]
      const isExpired = expDateStr && todayStr > expDateStr
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      if (isExpired) {
        doc.setTextColor(220, 38, 38) // Red
      } else {
        doc.setTextColor(22, 163, 74) // Green
      }
      
      const expLabel = `Vence em: ${formatDateNoTimezone(item.expiration_date)}`
      const expWidth = doc.getTextWidth(expLabel)
      doc.text(expLabel, pageWidth - margin - expWidth, currentY)
    }

    currentY += 6

    // Subtitle: Site Address
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const location = `${item.site_title}${item.site_address ? ` - ${item.site_address}` : ''}`
    const splitAddress = doc.splitTextToSize(location, pageWidth - margin * 2)
    doc.text(splitAddress, margin, currentY)
    currentY += (splitAddress.length * 5)

    // Details: Job Site / Lot
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    let details = ''
    if (item.construction_type && item.lot_building_number) {
      const typeLabel = item.construction_type === 'lot' ? 'Lote' : 'Prédio'
      details = `${typeLabel} ${item.lot_building_number}`
    }
    
    if (item.allocation_start) {
      const startDate = formatDateNoTimezone(item.allocation_start)
      details += details ? ` | Início: ${startDate}` : `Início: ${startDate}`
    }

    if (item.billing_type) {
      const billingLabel = item.billing_type === 'monthly' ? 'Mensal' : item.billing_type === 'weekly' ? 'Semanal' : 'Diário'
      details += details ? ` | Cobrança: ${billingLabel}` : `Cobrança: ${billingLabel}`
    }

    if (details) {
      doc.text(details, margin, currentY)
      currentY += 6
    }

    // Divider line
    doc.setDrawColor(240, 240, 240)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10
  })

  doc.save(`relatorio_vencimentos_${new Date().toISOString().split('T')[0]}.pdf`)
}

export const generateMachineHistoryPDF = async (machine: any, events: any[], periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Histórico do Equipamento', margin, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)

  // Machine Info Card
  let currentY = 60
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, currentY, pageWidth - margin * 2, 35, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(margin, currentY, pageWidth - margin * 2, 35, 'S')

  currentY += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30)
  doc.text(`${machine.unit_number}`, margin + 5, currentY)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`${machine.machine_type?.nome || 'Equipamento'}`, margin + 5, currentY + 6)

  // Machine Details (Grid)
  const detailY = currentY + 15
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Propriedade:', margin + 5, detailY)
  doc.text('Fornecedor:', margin + 65, detailY)
  doc.text('Status Atual:', margin + 125, detailY)

  doc.setFont('helvetica', 'normal')
  doc.text(machine.ownership_type === 'own' ? 'Própria' : 'Alugada', margin + 5, detailY + 5)
  doc.text(machine.supplier?.nome || 'N/A', margin + 65, detailY + 5)
  doc.text(getMachineStatusLabel(machine.status, machine.ownership_type), margin + 125, detailY + 5)

  currentY = 105

  // Timeline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Linha do Tempo de Eventos', margin, currentY)
  currentY += 10

  if (events.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.text('Nenhum evento registrado no período.', margin, currentY)
  } else {
    events.forEach((event: any) => {
      if (currentY > 260) {
        doc.addPage()
        currentY = 20
      }

      const config = getEventConfig(event.event_type)
      const eventDate = formatDateOnly(event.event_date)

      // Event background
      doc.setFillColor(252, 252, 252)
      doc.rect(margin, currentY, pageWidth - margin * 2, 25, 'F')
      
      // Vertical line for timeline
      doc.setDrawColor(230, 230, 230)
      doc.line(margin + 5, currentY, margin + 5, currentY + 25)

      // Event Title and Date
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(40)
      doc.text(config.label, margin + 10, currentY + 8)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(eventDate, pageWidth - margin - doc.getTextWidth(eventDate) - 2, currentY + 8)

      // Details
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      let detailText = ''
      if (event.site) detailText += `Local: ${event.site.title}`
      
      if (event.construction_type) {
        const type = event.construction_type === 'lot' ? 'Lote' : 'Prédio'
        detailText += `${detailText ? ' | ' : ''}${type} ${event.lot_building_number}`
      }
      
      if (detailText) {
        doc.text(detailText, margin + 10, currentY + 14)
      }

      // User and Status
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      const userText = `Realizado por: ${event.user?.nome || 'N/A'}`
      doc.text(userText, margin + 10, currentY + 20)

      if (event.status === 'rejected') {
        doc.setTextColor(220, 38, 38)
        doc.text('REJEITADO', pageWidth - margin - doc.getTextWidth('REJEITADO') - 2, currentY + 20)
      } else if (event.status === 'pending') {
        doc.setTextColor(234, 88, 12)
        doc.text('PENDENTE', pageWidth - margin - doc.getTextWidth('PENDENTE') - 2, currentY + 20)
      }

      currentY += 28
    })
  }

  doc.save(`historico_${machine.unit_number}_${new Date().getTime()}.pdf`)
}

export const generateRefuelingControlPDF = async (data: RefuelingControlData, periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.text('Controle de Abastecimento', margin, 35)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)

  // Date Interval (Right aligned)
  if (data.period) {
    const startDateStr = formatDateOnly(data.period.start)
    const endDateStr = formatDateOnly(data.period.end)
    const intervalText = `Datas inclusas: de ${startDateStr} até ${endDateStr}`
    const intervalWidth = doc.getTextWidth(intervalText)
    doc.text(intervalText, pageWidth - margin - intervalWidth, 42)
  }

  let currentY = 60

  data.events.forEach((event, index) => {
    // Check for page break
    if (currentY > 260) {
      doc.addPage()
      currentY = 20
    }

    // Title: Unit Number and Machine Type
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30)
    const machineTitle = `${event.machine?.unit_number || 'Sem Unit'} - ${event.machine?.machine_type?.nome || 'Equipamento'}`
    doc.text(machineTitle, margin, currentY)

    // Status (Opposite side)
    const statusLabel = event.status === 'approved' ? 'CONFIRMADO' : event.status === 'pending' ? 'PENDENTE' : 'REJEITADO'
    const statusColor = event.status === 'approved' ? [22, 163, 74] : event.status === 'pending' ? [220, 38, 38] : [100, 100, 100]
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
    const statusWidth = doc.getTextWidth(statusLabel)
    doc.text(statusLabel, pageWidth - margin - statusWidth, currentY)

    currentY += 6

    // Subtitle: Site Address
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const location = `${event.site?.title || 'Sem Jobsite'}${event.site?.address ? ` - ${event.site?.address}` : ''}`
    const splitAddress = doc.splitTextToSize(location, pageWidth - margin * 2)
    doc.text(splitAddress, margin, currentY)
    currentY += (splitAddress.length * 5)

    // Details: Date
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    const dateText = `Data: ${formatDateOnly(event.event_date)}`
    doc.text(dateText, margin, currentY)
    currentY += 6

    // Divider line
    doc.setDrawColor(240, 240, 240)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 10
  })

  doc.save(`controle_abastecimento_${new Date().getTime()}.pdf`)
}

