import React from 'react'
import { 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineArchiveBox, 
  HiOutlineArchiveBoxArrowDown,
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineChevronDown,
  HiOutlineChevronUp
} from 'react-icons/hi2'

interface ListActionButtonProps {
  icon: 'edit' | 'delete' | 'archive' | 'unarchive' | 'check' | 'add' | 'expand' | 'collapse' | React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title?: string
  className?: string
  variant?: 'blue' | 'red' | 'gray' | 'orange' | 'green'
}

export default function ListActionButton({
  icon,
  onClick,
  title,
  className = '',
  variant = 'gray'
}: ListActionButtonProps) {
  const variants = {
    blue: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30',
    red: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30',
    gray: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30',
    orange: 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30',
    green: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
  }

  const defaultIcons = {
    edit: <HiOutlinePencilSquare className="w-5 h-5" />,
    delete: <HiOutlineTrash className="w-5 h-5" />,
    archive: <HiOutlineArchiveBox className="w-5 h-5" />,
    unarchive: <HiOutlineArchiveBoxArrowDown className="w-5 h-5" />,
    check: <HiOutlineCheck className="w-5 h-5" />,
    add: <HiOutlinePlus className="w-5 h-5" />,
    expand: <HiOutlineChevronDown className="w-5 h-5" />,
    collapse: <HiOutlineChevronUp className="w-5 h-5" />
  }

  const iconToRender = typeof icon === 'string' ? defaultIcons[icon as keyof typeof defaultIcons] : icon

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className={`p-2.5 rounded-xl transition-all active:scale-95 ${variants[variant]} ${className}`}
      title={title}
    >
      {iconToRender}
    </button>
  )
}
