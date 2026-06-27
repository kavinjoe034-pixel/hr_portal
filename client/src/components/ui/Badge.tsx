import { clsx } from 'clsx'

type BadgeVariant =
  | 'Applied'
  | 'Form Submitted'
  | 'Interview Scheduled'
  | 'Offer Sent'
  | 'Hired'
  | 'Rejected'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  Applied: 'bg-blue-100 text-blue-800',
  'Form Submitted': 'bg-indigo-100 text-indigo-800',
  'Interview Scheduled': 'bg-amber-100 text-amber-800',
  'Offer Sent': 'bg-purple-100 text-purple-800',
  Hired: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-800',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant] ?? variantStyles.default,
        className,
      )}
    >
      {children}
    </span>
  )
}
