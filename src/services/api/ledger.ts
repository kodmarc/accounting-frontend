import { request } from './base'
import type { TaxRate, Account, Contact, Item, SalesSetting, Invoice, Quote, Project } from './types'

export const ledgerApi = {
  // Tax Rates CRUD
  async getTaxRates(orgId: string): Promise<TaxRate[]> {
    return request(`/tax-rates/?org_id=${orgId}`)
  },
  
  async createTaxRate(orgId: string, data: Partial<TaxRate>): Promise<TaxRate> {
    return request(`/tax-rates/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTaxRate(taxRateId: string, data: Partial<TaxRate>): Promise<TaxRate> {
    return request(`/tax-rates/${taxRateId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteTaxRate(taxRateId: string): Promise<{ message: string }> {
    return request(`/tax-rates/${taxRateId}/`, {
      method: 'DELETE',
    })
  },

  // Accounts (Chart of Accounts) CRUD
  async getAccounts(orgId: string): Promise<Account[]> {
    return request(`/accounts/?org_id=${orgId}`)
  },
  
  async importDefaultAccounts(orgId: string): Promise<Account[]> {
    return request(`/accounts/import-defaults/?org_id=${orgId}`, {
      method: 'POST',
    })
  },

  async createAccount(orgId: string, data: Partial<Account>): Promise<Account> {
    return request(`/accounts/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateAccount(accountId: string, data: Partial<Account>): Promise<Account> {
    return request(`/accounts/${accountId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteAccount(accountId: string): Promise<{ message: string }> {
    return request(`/accounts/${accountId}/`, {
      method: 'DELETE',
    })
  },
  
  async deleteAccountsBulk(orgId: string, accountIds: string[]): Promise<{ message: string }> {
    return request(`/accounts/bulk-delete/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify({ account_ids: accountIds }),
    })
  },

  // Contacts CRUD
  async getContacts(orgId: string): Promise<Contact[]> {
    return request(`/contacts/?org_id=${orgId}`)
  },

  async createContact(orgId: string, data: Partial<Contact>): Promise<Contact> {
    return request(`/contacts/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
    return request(`/contacts/${contactId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteContact(contactId: string): Promise<{ message: string }> {
    return request(`/contacts/${contactId}/`, {
      method: 'DELETE',
    })
  },

  // Items CRUD
  async getItems(orgId: string): Promise<Item[]> {
    return request(`/items/?org_id=${orgId}`)
  },

  async createItem(orgId: string, data: Partial<Item>): Promise<Item> {
    return request(`/items/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateItem(itemId: string, data: Partial<Item>): Promise<Item> {
    return request(`/items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteItem(itemId: string): Promise<{ message: string }> {
    return request(`/items/${itemId}/`, {
      method: 'DELETE',
    })
  },

  // Sales Settings CRUD
  async getSalesSettings(orgId: string): Promise<SalesSetting> {
    return request(`/sales-settings/?org_id=${orgId}`)
  },

  async updateSalesSettings(orgId: string, data: Partial<SalesSetting>): Promise<SalesSetting> {
    return request(`/sales-settings/?org_id=${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Invoices CRUD
  async getInvoices(orgId: string): Promise<Invoice[]> {
    return request(`/invoices/?org_id=${orgId}`)
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/`)
  },

  async createInvoice(orgId: string, data: Partial<Invoice>): Promise<Invoice> {
    return request(`/invoices/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateInvoice(invoiceId: string, data: Partial<Invoice>): Promise<Invoice> {
    return request(`/invoices/${invoiceId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteInvoice(invoiceId: string): Promise<{ message: string }> {
    return request(`/invoices/${invoiceId}/`, {
      method: 'DELETE',
    })
  },

  // Quotes CRUD
  async getQuotes(orgId: string): Promise<Quote[]> {
    return request(`/quotes/?org_id=${orgId}`)
  },

  async getQuote(quoteId: string): Promise<Quote> {
    return request(`/quotes/${quoteId}/`)
  },

  async createQuote(orgId: string, data: Partial<Quote>): Promise<Quote> {
    return request(`/quotes/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateQuote(quoteId: string, data: Partial<Quote>): Promise<Quote> {
    return request(`/quotes/${quoteId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteQuote(quoteId: string): Promise<{ message: string }> {
    return request(`/quotes/${quoteId}/`, {
      method: 'DELETE',
    })
  },

  // Projects CRUD
  async getProjects(orgId: string): Promise<Project[]> {
    return request(`/projects/?org_id=${orgId}`)
  },

  async createProject(orgId: string, data: Partial<Project>): Promise<Project> {
    return request(`/projects/?org_id=${orgId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
