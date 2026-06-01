import { request, type Membership, type Organization } from './base'

export const organizationsApi = {
  async getOrganizations(): Promise<Membership[]> {
    return request('/organizations/')
  },

  async createOrganization(name: string, country: string = '', currency: string = 'USD', taxId: string = ''): Promise<Membership> {
    return request('/organizations/', {
      method: 'POST',
      body: JSON.stringify({ name, country, currency, tax_id: taxId }),
    })
  },

  async updateOrganization(orgId: string, name: string, country: string = '', currency: string = 'USD', taxId: string = ''): Promise<Organization> {
    return request(`/organizations/${orgId}/`, {
      method: 'PUT',
      body: JSON.stringify({ name, country, currency, tax_id: taxId }),
    })
  },

  async deleteOrganization(orgId: string): Promise<{ message: string }> {
    return request(`/organizations/${orgId}/`, {
      method: 'DELETE',
    })
  },
}
