// src/services/api/types.ts

// Centralized type definitions for the frontend API.
// Fields that may be omitted or null from the backend are marked optional (?),
// otherwise they remain required. This follows TypeScript best‑practice of
// providing a single source of truth for data shapes.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://accounting-backend-aerq.onrender.com/api';

// ---------- Core Interfaces ----------
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  country: string;
  currency: string;
  tax_id: string;
  created_at: string;
}

export interface Membership {
  id: string;
  organization: Organization;
  role: 'Admin' | 'User';
  permissions: Record<string, boolean>;
  joined_at: string;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  class_type: 'Revenue' | 'Expense' | 'Asset' | 'Liability' | 'Equity';
  type: string;
  default_tax_rate?: string | null; // optional – backend may omit
  description: string;
  is_system_account: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  contact_type: 'Customer' | 'Supplier' | 'Both';
  email: string;
  phone: string;
  tax_number: string;
  billing_address: string;
  default_sales_account?: string | null;
  default_purchase_account?: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  is_sold: boolean;
  sales_unit_price: number;
  sales_account?: string | null;
  sales_tax_rate?: string | null;
  sales_description: string;
  is_purchased: boolean;
  purchase_unit_cost: number;
  purchase_account?: string | null;
  purchase_tax_rate?: string | null;
  purchase_description: string;
  created_at: string;
}

export interface SalesSetting {
  id?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  quote_prefix: string;
  next_quote_number: number;
  standard_payment_terms: string;
  default_footer: string;
}

export interface InvoiceLine {
  id?: string;
  item?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  account: string;
  tax_rate?: string | null;
  total: number;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  created_at?: string;
}

export interface Invoice {
  id?: string;
  contact: string;
  contact_name?: string;
  invoice_number: string;
  reference: string;
  date: string;
  due_date: string;
  status: 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid' | 'Overdue';
  currency?: string;
  tax_type?: 'Inclusive' | 'Exclusive' | 'No Tax';
  project?: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  lines: InvoiceLine[];
  created_at?: string;
}

export interface QuoteLine {
  id?: string;
  item?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  account: string;
  tax_rate?: string | null;
  total: number;
}

export interface Quote {
  id?: string;
  contact: string;
  contact_name?: string;
  quote_number: string;
  reference: string;
  date: string;
  expiry_date: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Invoiced';
  currency?: string;
  tax_type?: 'Inclusive' | 'Exclusive' | 'No Tax';
  project?: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  lines: QuoteLine[];
  created_at?: string;
}

// ---------- UI Specific Types ----------
// Unified tab identifiers used throughout the application.
export type TabId =
  | 'Home'
  | 'reconcile'
  | 'Contacts'
  | 'Customers'
  | 'Suppliers'
  | 'Invoices'
  | 'Quotes'
  | 'Bills'
  | 'PurchaseOrders'
  | 'BankAccounts'
  | 'Settings';
