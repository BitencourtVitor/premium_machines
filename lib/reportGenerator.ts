import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { adjustDateToSystemTimezone, formatDateOnly, formatDateNoTimezone } from '@/lib/timezone'

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

export const generateAllocationsPDF = async (data: AllocationData[], periodLabel: string) => {
  const doc = new jsPDF() as any
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Status das Alocações', margin, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodLabel}`, margin, 42)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 47)

  let currentY = 60

  const getStatusInfo = (status: string, is_in_downtime: boolean) => {
    if (is_in_downtime) {
      return { label: 'Em Manutenção', color: [234, 88, 12] } // Orange
    }
    
    switch (status) {
      case 'allocated': 
        return { label: 'Ativa', color: [22, 163, 74] } // Green
      case 'in_transit': 
        return { label: 'Em Transporte', color: [147, 51, 234] } // Purple
      case 'maintenance': 
        return { label: 'Em Manutenção', color: [234, 88, 12] } // Orange
      case 'exceeded': 
        return { label: 'Ativa - Prazo Excedido', color: [220, 38, 38] } // Red
      case 'available': 
        return { label: 'Disponível', color: [22, 163, 74] } // Green
      case 'inactive': 
        return { label: 'Inativa', color: [100, 100, 100] } // Gray
      default: 
        return { label: status, color: [100, 100, 100] }
    }
  }

  // Group data by site
  const groupedBySite = new Map<string, AllocationData[]>()
  data.forEach(item => {
    const site = item.site_title || 'Sem Localização'
    if (!groupedBySite.has(site)) groupedBySite.set(site, [])
    groupedBySite.get(site)?.push(item)
  })

  // Iterate over groups
  groupedBySite.forEach((machines, siteTitle) => {
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    // Site Header
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, currentY - 5, pageWidth - margin * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(40)
    doc.text(siteTitle.toUpperCase(), margin + 2, currentY)
    currentY += 10

    machines.forEach((item) => {
      if (currentY > 270) {
        doc.addPage()
        currentY = 20
      }

      // Machine Info
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30)
      const machineTitle = `${item.machine_unit_number} - ${item.machine_description || item.machine_type}`
      doc.text(machineTitle, margin + 5, currentY)

      // Status
      const statusInfo = getStatusInfo(item.status, item.is_in_downtime)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(statusInfo.color[0], statusInfo.color[1], statusInfo.color[2])
      const statusWidth = doc.getTextWidth(statusInfo.label)
      doc.text(statusInfo.label, pageWidth - margin - statusWidth, currentY)

      currentY += 5

      // Sub-location (Lot/Building)
      if (item.lot_building_number) {
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        const subLocation = `${item.construction_type === 'lot' ? 'Lote' : 'Prédio/Torre'}: ${item.lot_building_number}`
        doc.text(subLocation, margin + 5, currentY)
        currentY += 4
      }

      // Extensions
      if (item.attached_extensions && item.attached_extensions.length > 0) {
        item.attached_extensions.forEach((ext: any) => {
          doc.setFontSize(8)
          doc.setTextColor(140, 140, 140)
          doc.text(`   + Extensão: ${ext.extension_unit_number} (${ext.extension_type})`, margin + 5, currentY)
          currentY += 4
        })
      }

      currentY += 4
      // Thin separator between machines in the same site
      doc.setDrawColor(240)
      doc.line(margin + 5, currentY - 2, pageWidth - margin, currentY - 2)
      currentY += 4
    })

    currentY += 5 // Space after each site group
  })

  doc.save(`relatorio_alocacoes_${new Date().getTime()}.pdf`)
}

export const generateRentExpirationPDF = async (data: RentExpirationData[], periodLabel: string) => {
  const doc = new jsPDF() as any
  const pageWidth = doc.internal.pageSize.width
  const margin = 15

  await drawHeader(doc, margin)

  // Report Title
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('Relatório de Vencimento de Aluguéis', margin, 35)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodLabel}`, margin, 42)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 47)

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
      const typeLabel = item.construction_type === 'lot' ? 'Lote' : 'Prédio/Torre'
      details = `${typeLabel}: ${item.lot_building_number}`
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
