// src/services/api/types.ts
// Centralized type definitions for the frontend API.

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
  default_tax_rate?: string | null;
  description: string;
  is_system_account: boolean;
  is_active?: boolean;
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
  is_active?: boolean;
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
  is_active?: boolean;
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
  is_active?: boolean;
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

export interface BillLine {
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

export interface Bill {
  id?: string;
  contact: string;
  contact_name?: string;
  bill_number: string;
  reference: string;
  date: string;
  due_date: string;
  status: 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid';
  currency?: string;
  tax_type?: 'Inclusive' | 'Exclusive' | 'No Tax';
  project?: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  lines: BillLine[];
  created_at?: string;
}

export interface PurchaseOrderLine {
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

export interface PurchaseOrder {
  id?: string;
  contact: string;
  contact_name?: string;
  po_number: string;
  reference: string;
  date: string;
  expiry_date: string;
  status: 'Draft' | 'Awaiting Approval' | 'Approved' | 'Billed' | 'Declined';
  currency?: string;
  tax_type?: 'Inclusive' | 'Exclusive' | 'No Tax';
  project?: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  lines: PurchaseOrderLine[];
  created_at?: string;
}

// ---------- Email DTOs ----------
export interface SendEmailPayload {
  to: string;
  subject?: string;
  message?: string;
  [key: string]: any;
}

export interface SendBillEmailPayload {
  to: string;
  subject?: string;
  message?: string;
  [key: string]: any;
}

export interface SendPurchaseOrderEmailPayload {
  to: string;
  subject?: string;
  message?: string;
  [key: string]: any;
}
