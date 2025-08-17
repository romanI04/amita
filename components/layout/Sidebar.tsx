'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Analyze', href: '/analyze', icon: DocumentTextIcon },
  { name: 'History', href: '/history', icon: ChartBarIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Pricing', href: '/pricing', icon: CreditCardIcon },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">amita.ai</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">Free plan</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon 
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-600'
                }`} 
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Usage stats */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Analyses this month</span>
              <span>3 / 25</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
              <div className="bg-primary-500 h-1 rounded-full" style={{ width: '12%' }} />
            </div>
          </div>
          
          <Link href="/pricing" onClick={onClose}>
            <button className="w-full bg-primary-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
              Upgrade plan
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="px-3 pb-4">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon 
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-600'
                }`} 
              />
              {item.name}
            </Link>
          )
        })}
        
        <button
          onClick={() => {
            signOut()
            onClose?.()
          }}
          className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors w-full text-left mt-1"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
          Sign out
        </button>
      </div>
    </div>
  )
}