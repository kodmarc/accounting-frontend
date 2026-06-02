import { request } from './base'
import type { User } from './types'

export const authApi = {
  async signup(email: string, password: string, firstName: string = '', lastName: string = ''): Promise<{ user: User; token: string }> {
    const res = await request('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    })
    if (res && res.token) {
      localStorage.setItem('kdm_auth_token', res.token)
    }
    return res
  },

  async login(email: string, password: string): Promise<{ message: string; user: User; token: string }> {
    const res = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res && res.token) {
      localStorage.setItem('kdm_auth_token', res.token)
    }
    return res
  },

  async logout(): Promise<{ message: string }> {
    try {
      const res = await request('/auth/logout/', {
        method: 'POST',
      })
      return res
    } finally {
      localStorage.removeItem('kdm_auth_token')
    }
  },

  async getMe(): Promise<User> {
    return request('/auth/me/')
  },
}
