import { request } from './base'
import type { Membership, Organization, OrgMember, OrgInvitation, InvitationInfo } from './types'

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

  async getOrgMembers(orgId: string): Promise<{ members: OrgMember[]; invitations: OrgInvitation[] }> {
    return request(`/organizations/${orgId}/members/`)
  },

  async inviteOrgMember(orgId: string, email: string, role: 'Admin' | 'User', permissions: Record<string, boolean>): Promise<{ message: string; member?: OrgMember }> {
    return request(`/organizations/${orgId}/members/`, {
      method: 'POST',
      body: JSON.stringify({ email, role, permissions }),
    })
  },

  async updateOrgMember(orgId: string, membershipId: string, role: 'Admin' | 'User', permissions: Record<string, boolean>): Promise<OrgMember> {
    return request(`/organizations/${orgId}/members/${membershipId}/`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    })
  },

  async removeOrgMember(orgId: string, membershipId: string): Promise<{ message: string }> {
    return request(`/organizations/${orgId}/members/${membershipId}/`, {
      method: 'DELETE',
    })
  },

  async cancelInvitation(orgId: string, invitationId: string): Promise<{ message: string }> {
    return request(`/organizations/${orgId}/invitations/${invitationId}/`, {
      method: 'DELETE',
    })
  },

  async getInvitationInfo(token: string): Promise<InvitationInfo> {
    return request(`/invitations/${token}/`)
  },

  async acceptInvitation(token: string): Promise<{ message: string; membership: Membership }> {
    return request(`/invitations/${token}/accept/`, { method: 'POST' })
  },
}
