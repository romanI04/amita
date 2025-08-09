'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export interface FAQItemProps {
  question: string
  answer: string
  defaultOpen?: boolean
}

export interface FAQProps extends React.HTMLAttributes<HTMLDivElement> {
  items: FAQItemProps[]
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="faq-item">
      <button
        className="faq-button flex items-center justify-between w-full"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDownIcon
          className={cn(
            'h-5 w-5 text-neutral-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="faq-content">
          {answer}
        </div>
      </div>
    </div>
  )
}

const FAQ = React.forwardRef<HTMLDivElement, FAQProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('divide-y divide-neutral-200', className)}
        {...props}
      >
        {items.map((item, index) => (
          <FAQItem
            key={index}
            question={item.question}
            answer={item.answer}
            defaultOpen={item.defaultOpen}
          />
        ))}
      </div>
    )
  }
)

FAQ.displayName = 'FAQ'

export { FAQ, FAQItem }