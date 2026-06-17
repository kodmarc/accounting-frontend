import { request } from './base'
import type { User } from './types'

export const authApi = {
  async signup(email: string, password: string, firstName: string = '', lastName: string = ''): Promise<{ user: User }> {
    return request('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    })
  },

  async login(email: string, password: string): Promise<{ message: string; user: User }> {
    return request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async logout(): Promise<{ message: string }> {
    return request('/auth/logout/', { method: 'POST' })
  },

  async getMe(): Promise<User> {
    return request('/auth/me/')
  },

  async updateMe(firstName: string, lastName: string, password?: string): Promise<{ user: User; message: string }> {
    return request('/auth/me/', {
      method: 'PUT',
      body: JSON.stringify({ first_name: firstName, last_name: lastName, password }),
    })
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return request('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },
}
