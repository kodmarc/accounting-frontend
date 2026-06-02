//export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://accounting-backendd.onrender.com/api'

// Helper for making API calls with token authorization and credentials
export async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = localStorage.getItem('kdm_auth_token')
  if (token) {
    defaultHeaders['Authorization'] = `Token ${token}`
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  }

  const response = await fetch(url, mergedOptions)

  if (!response.ok) {
    let errorMessage = 'An error occurred.'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.detail || errorMessage
    } catch {
      // If response is not JSON
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

import type { User, Organization, Membership, TaxRate, Account, Contact, Item, SalesSetting, InvoiceLine, Project, Invoice, QuoteLine, Quote } from './types';
