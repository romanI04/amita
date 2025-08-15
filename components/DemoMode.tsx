'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exampleTexts, type ExampleText } from '@/lib/examples'
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  LightBulbIcon,
  ChartBarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function DemoMode() {
  const [selectedExample, setSelectedExample] = useState<ExampleText>(exampleTexts[0])
  const [activeTab, setActiveTab] = useState<'analysis' | 'improvements'>('analysis')
  const [customText, setCustomText] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High Risk', color: 'red' }
    if (score >= 40) return { label: 'Medium Risk', color: 'yellow' }
    return { label: 'Low Risk', color: 'green' }
  }

  const getAuthenticityLevel = (score: number) => {
    if (score >= 70) return { label: 'Highly Authentic', color: 'green' }
    if (score >= 40) return { label: 'Mixed', color: 'yellow' }
    return { label: 'Needs Improvement', color: 'red' }
  }

  const aiRisk = getRiskLevel(selectedExample.aiConfidence)
  const authenticity = getAuthenticityLevel(selectedExample.authenticityScore)

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BeakerIcon className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Try It Now - No Signup Required</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <SparklesIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Live Demo</span>
          </div>
        </div>
        <p className="text-white/90">
          Select an example below or paste your own text to see instant AI analysis
        </p>
      </div>

      {/* Example Selector */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-2 flex-wrap">
          {exampleTexts.map((example) => (
            <button
              key={example.id}
              onClick={() => {
                setSelectedExample(example)
                setShowCustom(false)
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedExample.id === example.id && !showCustom
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="capitalize">{example.category}</span>: {example.title}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              showCustom
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ✏️ Try Your Own Text
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-x divide-gray-200">
        {/* Left: Text Display */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            {showCustom ? 'Your Text' : selectedExample.title}
          </h3>
          
          {showCustom ? (
            <div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste your text here to analyze... (minimum 50 characters)"
                className="w-full h-64 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {customText.length} characters
                </span>
                {customText.length >= 50 && (
                  <Link href={`/signup?demo_text=${encodeURIComponent(customText.substring(0, 500))}`}>
                    <Button size="sm">
                      Analyze This Text
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">{selectedExample.description}</p>
              <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                {selectedExample.content}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                {selectedExample.wordCount} words
              </div>
            </>
          )}
        </div>

        {/* Right: Analysis Results */}
        <div className="p-6 bg-gray-50">
          {showCustom && customText.length < 50 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Enter at least 50 characters to see analysis</p>
            </div>
          ) : showCustom ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <SparklesIcon className="h-12 w-12 text-primary-500 mb-3 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze!</h3>
              <p className="text-gray-600 mb-4">Sign up to get instant AI analysis of your text</p>
              <Link href={`/signup?demo_text=${encodeURIComponent(customText.substring(0, 500))}`}>
                <Button>
                  Get Your Analysis
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">Instant Analysis</h3>
              
              {/* Risk Scores */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">AI Detection Risk</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      aiRisk.color === 'red' ? 'bg-red-100 text-red-700' :
                      aiRisk.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {aiRisk.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedExample.aiConfidence}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        aiRisk.color === 'red' ? 'bg-red-500' :
                        aiRisk.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${selectedExample.aiConfidence}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Authenticity</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      authenticity.color === 'green' ? 'bg-green-100 text-green-700' :
                      authenticity.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {authenticity.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedExample.authenticityScore}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        authenticity.color === 'green' ? 'bg-green-500' :
                        authenticity.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${selectedExample.authenticityScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'analysis'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  Issues Found
                </button>
                <button
                  onClick={() => setActiveTab('improvements')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'improvements'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <LightBulbIcon className="h-4 w-4 inline mr-1" />
                  Improvements
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'analysis' ? (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {selectedExample.detectedIssues.map((issue, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg flex gap-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{issue}</p>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="improvements"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {selectedExample.improvements.map((improvement, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg flex gap-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{improvement}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-900 mb-3">
                  Want to fix these issues automatically? Sign up for free to:
                </p>
                <ul className="text-sm text-primary-700 space-y-1 mb-4">
                  <li>• Get personalized suggestions</li>
                  <li>• Build your unique voice profile</li>
                  <li>• Track improvement over time</li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full">
                    Start Writing Better
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}