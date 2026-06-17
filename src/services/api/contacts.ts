import { request } from './base'
import type { Contact } from './types'

export const contactsApi = {
  async getContacts(orgId: string): Promise<Contact[]> {
    return request(`/contacts/?org_id=${orgId}`)
  },

  async createContact(orgId: string, data: Partial<Contact>): Promise<Contact> {
    return request(`/contacts/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateContact(contactId: string, data: Partial<Contact>, orgId: string): Promise<Contact> {
    return request(`/contacts/${contactId}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async patchContact(contactId: string, data: Partial<Contact>, orgId: string): Promise<Contact> {
    return request(`/contacts/${contactId}/?org_id=${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteContact(contactId: string): Promise<null> {
    return request(`/contacts/${contactId}/`, { method: 'DELETE' })
  },
}
