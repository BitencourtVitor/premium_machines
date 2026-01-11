import React from 'react'
import { 
  FaHome, FaUser, FaCog, FaSearch, FaPlus, FaTrash, FaEdit, 
  FaChevronLeft, FaChevronRight, FaFilter, FaSort, FaSortUp, FaSortDown,
  FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle, FaMapMarkerAlt,
  FaIndustry, FaTruck, FaCalendarAlt, FaMoneyBillWave, FaChartLine
} from 'react-icons/fa'
import { IconBaseProps } from 'react-icons'

const iconMap: { [key: string]: React.ComponentType<IconBaseProps> } = {
  home: FaHome,
  user: FaUser,
  settings: FaCog,
  search: FaSearch,
  plus: FaPlus,
  trash: FaTrash,
  edit: FaEdit,
  'chevron-left': FaChevronLeft,
  'chevron-right': FaChevronRight,
  filter: FaFilter,
  sort: FaSort,
  'sort-up': FaSortUp,
  'sort-down': FaSortDown,
  check: FaCheck,
  times: FaTimes,
  warning: FaExclamationTriangle,
  info: FaInfoCircle,
  location: FaMapMarkerAlt,
  machine: FaIndustry,
  truck: FaTruck,
  calendar: FaCalendarAlt,
  money: FaMoneyBillWave,
  chart: FaChartLine
}

export interface IconProps extends React.ComponentProps<'svg'> {
  name: string
  size?: number | string
  color?: string
  className?: string
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, color, className, ...props }) => {
  const IconComponent = iconMap[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in library`)
    return null
  }

  return (
    <IconComponent 
      size={size} 
      color={color} 
      className={className} 
      {...(props as any)} 
    />
  )
}
