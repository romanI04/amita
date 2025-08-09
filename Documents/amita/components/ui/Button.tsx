import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-soft hover:shadow-soft-lg focus-visible:ring-neutral-900',
        destructive: 'bg-error-600 text-white hover:bg-error-700 shadow-soft hover:shadow-soft-lg focus-visible:ring-error-500',
        outline: 'border border-neutral-200 bg-transparent hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 focus-visible:ring-neutral-500',
        secondary: 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-soft hover:shadow-soft-lg focus-visible:ring-neutral-500',
        ghost: 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 focus-visible:ring-neutral-500',
        link: 'underline-offset-4 hover:underline text-neutral-700 hover:text-neutral-900',
        purple: 'bg-secondary-600 text-white hover:bg-secondary-700 shadow-soft hover:shadow-soft-lg focus-visible:ring-secondary-500',
        arrow: 'bg-transparent hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 focus-visible:ring-neutral-500 group',
      },
      size: {
        sm: 'h-9 px-4 text-sm rounded-xl',
        default: 'h-11 px-6 rounded-2xl',
        lg: 'h-12 px-8 rounded-2xl text-lg',
        xl: 'h-14 px-10 rounded-2xl text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m12 2v4l1.5-1.5 1.5 1.5v-4z"
            />
          </svg>
        )}
        {children}
        {variant === 'arrow' && (
          <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }