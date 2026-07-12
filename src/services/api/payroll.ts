import { request } from './base'
import type { Employee, LeaveType, LeaveRequest, PayRun } from './types'

export const payrollApi = {
  // Employees
  async getEmployees(orgId: string, statusFilter?: string): Promise<Employee[]> {
    const params = new URLSearchParams({ org_id: orgId })
    if (statusFilter) params.set('status', statusFilter)
    return request(`/employees/?${params}`)
  },

  async createEmployee(orgId: string, data: Partial<Employee>): Promise<Employee> {
    return request(`/employees/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getEmployee(orgId: string, id: string): Promise<Employee> {
    return request(`/employees/${id}/?org_id=${orgId}`)
  },

  async updateEmployee(orgId: string, id: string, data: Partial<Employee>): Promise<Employee> {
    return request(`/employees/${id}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async terminateEmployee(orgId: string, id: string, endDate?: string): Promise<{ message: string }> {
    return request(`/employees/${id}/?org_id=${orgId}`, {
      method: 'DELETE',
      body: JSON.stringify({ end_date: endDate }),
    })
  },

  // Leave Types
  async getLeaveTypes(orgId: string): Promise<LeaveType[]> {
    return request(`/leave-types/?org_id=${orgId}`)
  },

  async createLeaveType(orgId: string, data: Partial<LeaveType>): Promise<LeaveType> {
    return request(`/leave-types/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateLeaveType(orgId: string, id: string, data: Partial<LeaveType>): Promise<LeaveType> {
    return request(`/leave-types/${id}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteLeaveType(orgId: string, id: string): Promise<{ message: string }> {
    return request(`/leave-types/${id}/?org_id=${orgId}`, { method: 'DELETE' })
  },

  // Leave Requests
  async getLeaveRequests(orgId: string, employeeId?: string, statusFilter?: string): Promise<LeaveRequest[]> {
    const params = new URLSearchParams({ org_id: orgId })
    if (employeeId) params.set('employee', employeeId)
    if (statusFilter) params.set('status', statusFilter)
    return request(`/leave-requests/?${params}`)
  },

  async createLeaveRequest(orgId: string, data: {
    employee: string
    leave_type: string
    from_date: string
    to_date: string
    reason?: string
  }): Promise<LeaveRequest> {
    return request(`/leave-requests/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async approveLeaveRequest(orgId: string, id: string): Promise<LeaveRequest> {
    return request(`/leave-requests/${id}/approve/?org_id=${orgId}`, { method: 'POST' })
  },

  async rejectLeaveRequest(orgId: string, id: string): Promise<LeaveRequest> {
    return request(`/leave-requests/${id}/reject/?org_id=${orgId}`, { method: 'POST' })
  },

  // Pay Runs
  async getPayRuns(orgId: string): Promise<PayRun[]> {
    return request(`/pay-runs/?org_id=${orgId}`)
  },

  async createPayRun(orgId: string, data: {
    period_label: string
    period_start: string
    period_end: string
    pay_date: string
    bank_account: string
  }): Promise<PayRun> {
    return request(`/pay-runs/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getPayRun(orgId: string, id: string): Promise<PayRun> {
    return request(`/pay-runs/${id}/?org_id=${orgId}`)
  },

  async updatePayRun(orgId: string, id: string, paycheques: PayRun['paycheques']): Promise<PayRun> {
    return request(`/pay-runs/${id}/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify({ paycheques }),
    })
  },

  async postPayRun(orgId: string, id: string): Promise<PayRun> {
    return request(`/pay-runs/${id}/post/?org_id=${orgId}`, { method: 'POST' })
  },

  async deletePayRun(orgId: string, id: string): Promise<{ message: string }> {
    return request(`/pay-runs/${id}/?org_id=${orgId}`, { method: 'DELETE' })
  },
}
