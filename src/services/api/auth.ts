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

  async updateMe(firstName: string, lastName: string): Promise<{ user: User; message: string }> {
    return request('/auth/me/', {
      method: 'PUT',
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    })
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ user: User; message: string }> {
    return request('/auth/me/', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, password: newPassword }),
    })
  },

  async requestOtp(email: string): Promise<{ message: string }> {
    return request('/auth/request-otp/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async verifyOtp(email: string, code: string, password: string): Promise<{ message: string }> {
    return request('/auth/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ email, code, password }),
    })
  },

  async requestEmailChange(newEmail: string): Promise<{ message: string }> {
    return request('/auth/request-email-change/', {
      method: 'POST',
      body: JSON.stringify({ email: newEmail }),
    })
  },

  async confirmEmailChange(code: string): Promise<{ user: User; message: string }> {
    return request('/auth/confirm-email-change/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },
}
