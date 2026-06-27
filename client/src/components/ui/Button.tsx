import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'primary' &&
            'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
          variant === 'secondary' &&
            'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
          variant === 'danger' &&
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
