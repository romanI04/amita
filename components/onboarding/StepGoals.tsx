'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface StepGoalsProps {
  onNext: (selectedGoals: string[]) => void
  onBack: () => void
}

const goalOptions = [
  { id: 'blog', label: 'Blog Posts', color: 'bg-blue-50 border-blue-200 text-blue-900' },
  { id: 'product', label: 'Product Updates', color: 'bg-purple-50 border-purple-200 text-purple-900' },
  { id: 'sales', label: 'Sales Email', color: 'bg-green-50 border-green-200 text-green-900' },
  { id: 'pr', label: 'PR & Marketing', color: 'bg-orange-50 border-orange-200 text-orange-900' },
  { id: 'social', label: 'Social Media', color: 'bg-pink-50 border-pink-200 text-pink-900' },
  { id: 'other', label: 'Other', color: 'bg-gray-50 border-gray-200 text-gray-900' },
]

export default function StepGoals({ onNext, onBack }: StepGoalsProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    )
  }

  const handleNext = () => {
    onNext(selectedGoals)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          What do you write?
        </h2>
        <p className="text-lg text-gray-600">
          Select all that apply
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
        {goalOptions.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`
              p-4 rounded-xl border-2 transition-all duration-200 text-center font-medium
              ${selectedGoals.includes(goal.id)
                ? `${goal.color} scale-105 shadow-sm`
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {goal.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={selectedGoals.length === 0}
          className="bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}