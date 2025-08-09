import React from 'react'
import { cn } from '@/lib/utils'

export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description: string
  href?: string
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ className, icon, title, description, href, ...props }, ref) => {
    if (href) {
      return (
        <a
          href={href}
          className={cn(
            'feature-card group cursor-pointer hover:bg-neutral-50',
            className
          )}
        >
          {icon && (
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 transition-colors duration-200">
              {icon}
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="feature-title">
              {title}
            </h3>
            <p className="text-muted leading-relaxed">
              {description}
            </p>
          </div>
        </a>
      )
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'feature-card group cursor-pointer',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 transition-colors duration-200">
            {icon}
          </div>
        )}
        
        <div className="space-y-3">
          <h3 className="feature-title">
            {title}
          </h3>
          <p className="text-muted leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'

export { FeatureCard }