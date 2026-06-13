import { request } from './base'
import type { Project } from './types'

export const projectsApi = {
  async getProjects(orgId: string): Promise<Project[]> {
    return request(`/projects/?org_id=${orgId}`)
  },

  async createProject(orgId: string, data: Partial<Project>): Promise<Project> {
    return request(`/projects/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateProject(projectId: string, data: Partial<Project>): Promise<Project> {
    return request(`/projects/${projectId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteProject(projectId: string): Promise<null> {
    return request(`/projects/${projectId}/`, { method: 'DELETE' })
  },
}
