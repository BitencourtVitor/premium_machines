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
  construction_type: 'house' | 'building' | null
  lot_building_number: string | null
  status: string
  is_in_downtime: boolean
  attached_extensions: any[]
  end_date?: string | null
  allocation_start?: string | null
  ownership_type?: string
  days_remaining?: number | null
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
    const lot = item.construction_type === 'house'
      ? (item.lot_building_number ? `House ${item.lot_building_number}` : 'House')
      : item.construction_type === 'building' && item.lot_building_number
        ? `Building ${item.lot_building_number}`
        : 'Geral / Sem Localização'
      
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
      
      if (event.construction_type === 'house') {
        const label = event.lot_building_number ? `House ${event.lot_building_number}` : 'House'
        detailText += `${detailText ? ' | ' : ''}${label}`
      } else if (event.construction_type === 'building' && event.lot_building_number) {
        detailText += `${detailText ? ' | ' : ''}Building ${event.lot_building_number}`
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

export const generateMaintenanceTimePDF = async (data: any[], periodLabel: string) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth() || 210
    const margin = 15

    await drawHeader(doc, margin)

    // Report Title
    doc.setFontSize(12)
    doc.setTextColor(40)
    doc.setFont('helvetica', 'bold')
    doc.text('Relatório de Tempo de Manutenção', margin, 35)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)
    doc.text(`Período: ${periodLabel}`, margin, 47)

    let currentY = 60

    if (!data || data.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.text('Nenhuma manutenção encontrada para o período selecionado.', margin, currentY)
        doc.save(`relatorio_manutencao_${new Date().getTime()}.pdf`)
        return
    }

    data.forEach((item, index) => {
        // Calculate duration
        const startDate = new Date(item.start_date)
        const endDate = item.end_date ? new Date(item.end_date) : new Date()
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const durationText = item.is_ongoing 
            ? `${diffDays} dias (Em aberto)` 
            : `${diffDays} dias`

        // Check for page break
        const descText = item.description || 'N/A'
        const splitDesc = doc.splitTextToSize(descText, pageWidth - margin * 2 - 35) // More padding

        // Section heights
        const section1Height = 12
        const section2Height = (splitDesc.length * 5) + 14 // Increased padding
        const section3Height = 12
        const headerHeight = 14

        // Calculate card height dynamically
        const cardHeight = headerHeight + section1Height + section2Height + section3Height + 10 // More bottom space

        if (currentY + cardHeight > 280) {
            doc.addPage()
            currentY = 20
        }

        // Card Container (Main)
        doc.setFillColor(252, 252, 252)
        doc.setDrawColor(200, 200, 200)
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, cardHeight, 2, 2, 'FD')

        // Header: Machine and Status
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(30)
        doc.text(`${item.machine_unit_number} - ${item.machine_type}`, margin + 5, currentY + 8)

        // Status Badge
        const statusLabel = item.is_ongoing ? 'EM ABERTO' : 'CONCLUÍDA'
        const statusColor = item.is_ongoing ? [234, 88, 12] : [22, 163, 74]
        doc.setFontSize(8)
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
        const statusWidth = doc.getTextWidth(statusLabel)
        doc.text(statusLabel, pageWidth - margin - statusWidth - 8, currentY + 8)

        currentY += headerHeight

        // Internal Content Container
        const contentWidth = pageWidth - margin * 2 - 10
        const contentX = margin + 5
        
        // Reset colors for Section 1
        doc.setDrawColor(230, 230, 230)
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(contentX, currentY, contentWidth, section1Height, 1, 1, 'FD')
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('Início:', contentX + 5, currentY + 7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(formatDateOnly(item.start_date), contentX + 18, currentY + 7.5)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Fim:', contentX + 60, currentY + 7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(item.is_ongoing ? '-' : formatDateOnly(item.end_date), contentX + 70, currentY + 7.5)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Duração:', contentX + 120, currentY + 7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(durationText, contentX + 140, currentY + 7.5)

        currentY += section1Height + 2

        // Section 2: Description (Observation)
        // Explicitly set background color to white and text to dark
        doc.setDrawColor(230, 230, 230)
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(contentX, currentY, contentWidth, section2Height, 1, 1, 'FD')
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('Observação:', contentX + 5, currentY + 6)
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(splitDesc, contentX + 5, currentY + 12)

        currentY += section2Height + 2

        // Section 3: Responsible
        // Explicitly set background color to white and text to dark
        doc.setDrawColor(230, 230, 230)
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(contentX, currentY, contentWidth, section3Height, 1, 1, 'FD')
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('Responsável:', contentX + 5, currentY + 7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(item.user_name || 'N/A', contentX + 30, currentY + 7.5)

        currentY += section3Height + 12 // Increased space between cards and bottom padding
    })

    doc.save(`relatorio_manutencao_${new Date().getTime()}.pdf`)
}

export const generateAllocationCreditsPDF = async (
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
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth() || 210
  const margin = 15

  await drawHeader(doc, margin)

  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.text('Pagamentos por Alocação', margin, 35)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 42)

  let currentY = 54

  const ensurePage = (neededHeight: number) => {
    if (currentY + neededHeight <= 280) return
    doc.addPage()
    currentY = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text('Alocações no período', margin, currentY)
  currentY += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setFillColor(34, 197, 94)
  doc.rect(margin, currentY - 2.8, 3, 3, 'F')
  doc.setTextColor(90, 90, 90)
  doc.text('Alocado', margin + 4.5, currentY)
  doc.setFillColor(249, 115, 22)
  doc.rect(margin + 26, currentY - 2.8, 3, 3, 'F')
  doc.text('Manutenção', margin + 30.5, currentY)
  currentY += 8

  type IconType = 'active' | 'inactive'

  const faFontName = 'FA'
  const faFontFile = 'fa-solid-900.ttf'
  const faFontUrl = '/fontawesome/fa-solid-900.ttf'

  const faGlyphs: Record<IconType, string> = {
    active: String.fromCodePoint(0xf017),   // clock
    inactive: String.fromCodePoint(0xf7d9), // wrench
  }

  let faFontLoaded = false
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk)
      for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j])
    }
    return btoa(binary)
  }

  const ensureFaFont = async () => {
    if (faFontLoaded) return
    const res = await fetch(faFontUrl)
    if (!res.ok) return
    const buf = await res.arrayBuffer()
    const b64 = arrayBufferToBase64(buf)
    doc.addFileToVFS(faFontFile, b64)
    doc.addFont(faFontFile, faFontName, 'normal')
    faFontLoaded = true
  }

  await ensureFaFont()

  const drawFaIcon = (
    iconType: IconType,
    x: number,
    y: number,
    slotW: number,
    slotH: number,
    color: readonly [number, number, number],
    fontSize?: number
  ) => {
    if (!faFontLoaded) return
    const glyph = faGlyphs[iconType]
    doc.setFont(faFontName, 'normal')
    doc.setTextColor(color[0], color[1], color[2])
    doc.setFontSize(fontSize ?? Math.max(10, slotH * 1.15))
    doc.text(glyph, x + slotW / 2, y + slotH * 0.7, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  }

  const drawFieldBox = (
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    valueColor?: readonly [number, number, number],
    iconType?: IconType,
    iconColor?: readonly [number, number, number]
  ) => {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(230, 230, 230)
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD')

    const iconSlotW = h
    const contentX = x + (iconType ? iconSlotW : 0) + 3

    if (iconType && iconColor) drawFaIcon(iconType, x, y, iconSlotW, h, iconColor)

    if (iconType) {
      doc.setDrawColor(235, 235, 235)
      doc.line(x + iconSlotW, y + 1.4, x + iconSlotW, y + h - 1.4)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(label, contentX, y + 4)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    if (valueColor) doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
    else doc.setTextColor(40, 40, 40)
    doc.text(value, contentX, y + 9)
    doc.setFont('helvetica', 'normal')
  }

  type TimelineSegment = { type: 'allocated' | 'maintenance'; days: number }

  const TIMELINE_COLORS = {
    allocated: [34, 197, 94] as const,   // Tailwind green-500
    maintenance: [249, 115, 22] as const, // Tailwind orange-500
  }

  const buildTimelineSegments = (a: any): TimelineSegment[] => {
    const startMs = new Date(a.start_date).getTime()
    const endMs = new Date(a.end_date || new Date().toISOString()).getTime()
    if (!(endMs > startMs)) return []

    const dayMs = 24 * 60 * 60 * 1000
    const periods = (Array.isArray(a.maintenance_periods) ? a.maintenance_periods : [])
      .map((p: any) => ({ startMs: new Date(p.start_date).getTime(), endMs: new Date(p.end_date).getTime() }))
      .filter((p: any) => p.endMs > p.startMs && p.endMs > startMs && p.startMs < endMs)
      .sort((x: any, y: any) => x.startMs - y.startMs)

    const segments: TimelineSegment[] = []
    let cursor = startMs

    for (const p of periods) {
      const segStart = Math.max(cursor, startMs)
      const segEnd = Math.min(p.startMs, endMs)
      if (segEnd > segStart) segments.push({ type: 'allocated', days: (segEnd - segStart) / dayMs })

      const maintStart = Math.max(p.startMs, startMs)
      const maintEnd = Math.min(p.endMs, endMs)
      if (maintEnd > maintStart) segments.push({ type: 'maintenance', days: (maintEnd - maintStart) / dayMs })

      cursor = Math.max(cursor, maintEnd)
    }

    if (endMs > cursor) segments.push({ type: 'allocated', days: (endMs - cursor) / dayMs })

    return segments.filter(s => s.days > 0)
  }

  const drawTimelineBar = (x: number, y: number, w: number, h: number, segments: TimelineSegment[]) => {
    const totalDays = segments.reduce((sum, s) => sum + s.days, 0)
    doc.setDrawColor(210, 210, 210)
    doc.rect(x, y, w, h, 'S')
    if (totalDays <= 0) return

    let segX = x
    for (const seg of segments) {
      const segW = (seg.days / totalDays) * w
      const color = TIMELINE_COLORS[seg.type]
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(segX, y, Math.max(segW, 0.1), h, 'F')
      segX += segW
    }
  }

  const timelineBlockH = 14 // label + gap + barra
  const eventRowH = 7
  const MAX_VISIBLE_MAINT_EVENTS = 4

  type TimelineEvent = { label: string; dateIso: string | null; withTime: boolean; isMaintenance: boolean }

  const buildTimelineEvents = (a: any): { events: TimelineEvent[]; hiddenCount: number } => {
    const periods = Array.isArray(a.maintenance_periods) ? a.maintenance_periods : []
    const visible = periods.slice(0, MAX_VISIBLE_MAINT_EVENTS)
    const hiddenCount = Math.max(0, periods.length - visible.length)

    const middle: TimelineEvent[] = visible.flatMap((p: any) => [
      { label: `Manutenção — Início${p.description ? ` (${p.description})` : ''}`, dateIso: p.start_date, withTime: true, isMaintenance: true },
      { label: 'Manutenção — Fim', dateIso: p.end_date, withTime: true, isMaintenance: true },
    ])
    middle.sort((x, y) => new Date(x.dateIso as string).getTime() - new Date(y.dateIso as string).getTime())

    const events: TimelineEvent[] = [
      { label: 'Início da Locação', dateIso: a.start_date, withTime: false, isMaintenance: false },
      ...middle,
      { label: a.is_ongoing ? 'Em Andamento' : 'Encerramento da Locação', dateIso: a.end_date, withTime: false, isMaintenance: false },
    ]

    return { events, hiddenCount }
  }

  const drawEventTimelineList = (x: number, y: number, w: number, events: TimelineEvent[], hiddenCount: number): number => {
    const dotR = 1.3
    const dotX = x + dotR + 0.5

    if (events.length > 1) {
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(dotX, y + eventRowH / 2, dotX, y + eventRowH * (events.length - 1) + eventRowH / 2)
    }

    events.forEach((ev, i) => {
      const rowY = y + i * eventRowH
      const color = ev.isMaintenance ? TIMELINE_COLORS.maintenance : TIMELINE_COLORS.allocated

      doc.setFillColor(color[0], color[1], color[2])
      doc.circle(dotX, rowY + eventRowH / 2, dotR, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(60, 60, 60)
      const labelLines = doc.splitTextToSize(ev.label, w - 8)
      doc.text(labelLines[0], dotX + 5, rowY + eventRowH / 2 - 0.6)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      const dateLabel = ev.dateIso ? (ev.withTime ? formatWithSystemTimezone(ev.dateIso) : formatDateOnly(ev.dateIso)) : 'Em andamento'
      doc.text(dateLabel, dotX + 5, rowY + eventRowH / 2 + 3)
    })

    let consumedH = events.length * eventRowH
    if (hiddenCount > 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(`+ ${hiddenCount} manutenções`, dotX + 5, y + consumedH + 3)
      consumedH += 6
    }

    return consumedH
  }

  const drawAllocationCard = (a: any) => {
    const boxGap = 3
    const boxH = 11

    const cardWidth = pageWidth - margin * 2
    const leftX = margin + 5
    const cardX = margin

    const rightPanelWidth = 78
    const rightPanelX = cardX + cardWidth - rightPanelWidth - 5

    const leftMaxWidth = rightPanelX - leftX - 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const location = `${a.site_title}${a.site_address ? ` - ${a.site_address}` : ''}`
    const locationLines = doc.splitTextToSize(location, leftMaxWidth).slice(0, 2)

    const supplierName = a.supplier_name || 'Fornecedor desconhecido'
    const supplierLineOffsetY = locationLines.length === 2 ? 24 : 20.5

    const daysBoxOffsetY = supplierLineOffsetY + 2.5
    const daysBoxW = Math.min(96, leftMaxWidth)

    const { events: timelineEvents, hiddenCount: hiddenMaintenanceCount } = buildTimelineEvents(a)

    // Coluna esquerda: identificação + dias + barra de progressão. Coluna direita: só a lista de eventos
    // (pode crescer bastante quando há muitas manutenções, sem "esticar" o conteúdo da esquerda).
    const leftColumnH = daysBoxOffsetY + boxH + 6 + timelineBlockH + 6
    const rightColumnH = 7 + timelineEvents.length * eventRowH + (hiddenMaintenanceCount > 0 ? 6 : 0) + 6

    const cardHeight = Math.max(40, leftColumnH, rightColumnH)

    ensurePage(cardHeight + 6)

    const cardY = currentY

    doc.setFillColor(252, 252, 252)
    doc.setDrawColor(210, 210, 210)
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(`${a.unit_number} - ${a.machine_type}`, leftX, cardY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(90, 90, 90)
    doc.text(locationLines, leftX, cardY + 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(110, 110, 110)
    doc.text(`Fornecedor: ${supplierName}`, leftX, cardY + supplierLineOffsetY)

    const metricBoxW = (daysBoxW - boxGap) / 2
    drawFieldBox(
      'Dias Ativos',
      `${Number(a.valid_days || 0)} dias`,
      leftX,
      cardY + daysBoxOffsetY,
      metricBoxW,
      boxH,
      TIMELINE_COLORS.allocated,
      'active',
      TIMELINE_COLORS.allocated
    )
    drawFieldBox(
      'Dias Inativos (Manut.)',
      `${Number(a.invalid_days || 0)} dias`,
      leftX + metricBoxW + boxGap,
      cardY + daysBoxOffsetY,
      metricBoxW,
      boxH,
      TIMELINE_COLORS.maintenance,
      'inactive',
      TIMELINE_COLORS.maintenance
    )

    drawEventTimelineList(rightPanelX, cardY + 7, rightPanelWidth, timelineEvents, hiddenMaintenanceCount)

    const timelineY = cardY + daysBoxOffsetY + boxH + 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    const totalDaysLabel = typeof a.total_days === 'number' ? `${a.total_days} dias` : ''
    doc.text(`Progressão da locação${totalDaysLabel ? ` — ${totalDaysLabel}` : ''}`, leftX, timelineY)
    drawTimelineBar(leftX, timelineY + 2, daysBoxW, 6, buildTimelineSegments(a))

    currentY += cardHeight + 8
  }

  for (const a of allocations || []) {
    drawAllocationCard(a)
  }

  doc.save(`pagamentos_por_alocacao_${new Date().getTime()}.pdf`)
}

// ── Backcharges ────────────────────────────────────────────────────────────────

export const generateBackchargesPDF = async (backcharges: any[], periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Relatório de Backcharges', margin, 35)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodLabel}`, margin, 42)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 48)
  doc.text(`Total: ${backcharges.length} backcharge(s)`, pageWidth - margin - 60, 42)

  const rows = backcharges.map(b => {
    const date = formatDateOnly(b.event_date)
    const machine = b.machine?.unit_number || '—'
    const site = b.site?.title || '—'
    const subs = (b.backcharge_suppliers || [])
      .map((s: any) => s.nome || String(s))
      .filter(Boolean)
      .join(', ') || '—'
    const description = b.downtime_description || '—'
    return [date, machine, site, subs, description]
  })

  autoTable(doc, {
    startY: 58,
    head: [['Data', 'Máquina', 'Obra', 'Subcontratados', 'Descrição']],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 38 },
      3: { cellWidth: 45 },
      4: { cellWidth: 'auto' },
    },
  })

  doc.save(`backcharges_${new Date().getTime()}.pdf`)
}

// ── Events by site ─────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, [number, number, number]> = {
  start_allocation:  [46, 134, 193],
  end_allocation:    [220, 38, 38],
  downtime_start:    [234, 88, 12],
  downtime_end:      [22, 163, 74],
  transport_start:   [13, 148, 136],
  transport_arrival: [6, 182, 212],
  request_allocation:[147, 51, 234],
  extension_attach:  [243, 156, 18],
  extension_detach:  [230, 126, 34],
  refueling:         [202, 138, 4],
}

const EVENT_LABELS_PT: Record<string, string> = {
  start_allocation:   'Alocação de Máquina',
  end_allocation:     'Fim de Alocação',
  downtime_start:     'Início de Manutenção',
  downtime_end:       'Fim de Manutenção',
  transport_start:    'Início de Transporte',
  transport_arrival:  'Chegada em Obra',
  request_allocation: 'Solicitação de Alocação',
  extension_attach:   'Alocação de Extensão',
  extension_detach:   'Fim de Alocação de Extensão',
  refueling:          'Abastecimento',
}

export const generateEventsBySitePDF = async (sites: { site: any; events: any[] }[], periodLabel: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Eventos por Obra', margin, 35)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodLabel}`, margin, 42)
  doc.text(`Gerado em: ${formatWithSystemTimezone(new Date().toISOString())}`, margin, 48)

  let currentY = 58

  const addPageIfNeeded = (needed: number) => {
    if (currentY + needed > doc.internal.pageSize.height - 15) {
      doc.addPage()
      currentY = 20
    }
  }

  for (const { site, events } of sites) {
    addPageIfNeeded(20)

    // Site header block
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(margin, currentY - 4, pageWidth - margin * 2, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.text(site.title?.toUpperCase() || 'SEM NOME', margin + 4, currentY + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    const siteSubtitle = [site.address, site.city].filter(Boolean).join(' · ')
    if (siteSubtitle) doc.text(siteSubtitle, margin + 4, currentY + 9)
    const countText = `${events.length} evento(s)`
    doc.text(countText, pageWidth - margin - doc.getTextWidth(countText) - 4, currentY + 4)
    currentY += 18

    // Events list
    for (const event of events) {
      addPageIfNeeded(8)

      const color = EVENT_COLORS[event.event_type] || [100, 100, 100]
      const label = EVENT_LABELS_PT[event.event_type] || event.event_type
      const machine = event.machine?.unit_number || event.extension?.unit_number || '—'
      const date = formatDateOnly(event.event_date)

      // Color dot
      doc.setFillColor(color[0], color[1], color[2])
      doc.circle(margin + 3, currentY + 1.5, 1.5, 'F')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(50, 50, 50)
      doc.text(label, margin + 8, currentY + 3)

      doc.setTextColor(80, 80, 80)
      const machineX = margin + 8 + doc.getTextWidth(label) + 4
      doc.setFont('helvetica', 'bold')
      doc.text(machine, machineX, currentY + 3)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130, 130, 130)
      doc.text(date, pageWidth - margin - doc.getTextWidth(date), currentY + 3)

      // Backcharge badge
      if (event.gera_backcharge) {
        doc.setFillColor(254, 243, 199)
        doc.setTextColor(146, 64, 14)
        doc.setFontSize(7)
        const bcLabel = 'BACKCHARGE'
        const bcW = doc.getTextWidth(bcLabel) + 4
        doc.roundedRect(pageWidth - margin - doc.getTextWidth(date) - bcW - 6, currentY - 0.5, bcW, 5, 1, 1, 'F')
        doc.text(bcLabel, pageWidth - margin - doc.getTextWidth(date) - bcW - 4, currentY + 3)
      }

      currentY += 7
    }

    currentY += 6
  }

  doc.save(`eventos_por_obra_${new Date().getTime()}.pdf`)
}
