'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthTest() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const supabase = createClient()

  const testSignIn = async () => {
    try {
      setLoading(true)
      setResult('Starting sign in...')
      
      console.log('Direct test sign in starting...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Direct test sign in result:', { data: !!data.user, error })
      
      if (error) {
        setResult(`Error: ${error.message}`)
      } else {
        setResult(`Success! User: ${data.user?.email}`)
      }
    } catch (err) {
      console.error('Direct test sign in catch:', err)
      setResult(`Catch error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-yellow-100 border-2 border-yellow-400 rounded-lg">
      <h2 className="text-xl font-bold mb-4">🧪 AUTH DEBUG TEST</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="romaniv0411@gmail.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="password"
          />
        </div>
        
        <button
          onClick={testSignIn}
          disabled={loading || !email || !password}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Direct Sign In (No AuthProvider)'}
        </button>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <pre className="text-sm">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}