/**
 * Direct REST API helper functions for Supabase
 * Bypasses the hanging Supabase JS client issue
 */

interface DirectApiOptions {
  accessToken?: string
}

export const directInsert = async (
  table: string, 
  data: any, 
  options: DirectApiOptions = {}
) => {
  const { accessToken } = options
  
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`
  
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Direct insert failed: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  return { data: result, error: null }
}

export const directUpsert = async (
  table: string, 
  data: any, 
  options: DirectApiOptions = {}
) => {
  const { accessToken } = options
  
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}`
  
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation,resolution=merge-duplicates'
  }
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Direct upsert failed: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  return { data: result, error: null }
}

export const directUpdate = async (
  table: string, 
  data: any, 
  filter: string,
  options: DirectApiOptions = {}
) => {
  const { accessToken } = options
  
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${filter}`
  
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Direct update failed: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  return { data: result, error: null }
}

export const directSelect = async (
  table: string, 
  filter: string = '',
  select: string = '*',
  options: DirectApiOptions = {}
) => {
  const { accessToken } = options
  
  const params = new URLSearchParams()
  if (select !== '*') params.append('select', select)
  if (filter) params.append(filter.split('=')[0], filter.split('=').slice(1).join('='))
  
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}${params.toString() ? '?' + params.toString() : ''}`
  
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'Content-Type': 'application/json'
  }
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  const response = await fetch(url, { headers })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Direct select failed: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  return { data: result, error: null }
}