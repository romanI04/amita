import React from 'react'
import { cn } from '@/lib/utils'

export interface TestimonialProps extends React.HTMLAttributes<HTMLDivElement> {
  quote: string
  author: {
    name: string
    role: string
    company?: string
    avatar?: string
  }
}

const Testimonial = React.forwardRef<HTMLDivElement, TestimonialProps>(
  ({ className, quote, author, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('feature-card text-left', className)}
        {...props}
      >
        <blockquote className="text-lg text-neutral-900 leading-relaxed mb-6 font-medium">
          "{quote}"
        </blockquote>
        
        <div className="flex items-center space-x-4">
          {author.avatar && (
            <img
              src={author.avatar}
              alt={author.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <div>
            <div className="font-semibold text-neutral-900">
              {author.name}
            </div>
            <div className="text-sm text-neutral-600">
              {author.role}
              {author.company && (
                <span className="text-neutral-400"> at {author.company}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

Testimonial.displayName = 'Testimonial'

export { Testimonial }