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

  // Branding
  logo: string;

  // Bank details
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_swift_code: string;
  bank_additional_instructions: string;

  // Extended profile
  org_extensions: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };

  // Template preferences
  sales_template_settings: {
    theme?: string;
    showLogo?: boolean;
    showUEN?: boolean;
    showTerms?: boolean;
    theme_color?: string;
    custom_layout?: unknown;
  };
  purchase_template_settings: {
    theme?: string;
    showLogo?: boolean;
    showUEN?: boolean;
    showTerms?: boolean;
    theme_color?: string;
    custom_layout?: unknown;
  };

  // Purchases config
  purchase_settings: {
    po_prefix?: string;
    next_po_number?: number;
    bill_prefix?: string;
    next_bill_number?: number;
    supplier_terms?: string;
    purchase_footer?: string;
  };

  // Financial year
  accounts_settings: {
    year_end_month?: string;
    year_end_day?: string;
  };
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
  track_quantity: boolean;
  quantity_on_hand?: number | null;
  is_active?: boolean;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  movement_type: 'sale' | 'purchase' | 'manual_add' | 'manual_remove';
  quantity_change: number;
  quantity_after: number;
  reference_type: string;
  reference_id: string | null;
  notes: string;
  created_by_name: string | null;
  created_at: string;
}

export interface SalesSetting {
  id?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  quote_prefix: string;
  next_quote_number: number;
  bill_prefix: string;
  next_bill_number: number;
  po_prefix: string;
  next_po_number: number;
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

// ---------- Org Members & Invitations ----------
export interface OrgMember {
  id: string;
  user: User;
  role: 'Admin' | 'User';
  permissions: Record<string, boolean>;
  joined_at: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: 'Admin' | 'User';
  permissions: Record<string, boolean>;
  status: 'pending' | 'accepted';
  created_at: string;
  expires_at: string;
}

export interface InvitationInfo {
  organization_name: string;
  invited_by: string;
  email: string;
  role: string;
  status: string;
  is_expired: boolean;
}

// ---------- Payroll ----------
export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string | null;
  job_title: string;
  department: string;
  employment_type: 'Full-time' | 'Part-time' | 'Contract';
  start_date: string;
  end_date: string | null;
  status: 'Active' | 'Terminated';
  pay_frequency: 'Monthly' | 'Fortnightly' | 'Weekly';
  gross_salary: number;
  salary_account: string | null;
  salary_account_name: string;
  tax_id: string;
  leave_balances: EmployeeLeaveBalance[];
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_per_year: number;
  is_paid: boolean;
  is_active: boolean;
}

export interface EmployeeLeaveBalance {
  id: string;
  leave_type: string;
  leave_type_name: string;
  year: number;
  entitled_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  leave_type_name: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface PaychequeDeductionLine {
  id?: string;
  label: string;
  amount: number;
  account: string;
}

export interface Paycheque {
  id: string;
  employee: string;
  employee_name: string;
  employee_id_code: string;
  salary_account_id: string | null;
  gross_salary: number;
  net_pay: number;
  notes: string;
  deduction_lines: PaychequeDeductionLine[];
}

export interface PayRun {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  bank_account: string;
  status: 'Draft' | 'Posted';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  paycheques: Paycheque[];
  created_at: string;
}

// ---------- Fixed Assets ----------
export interface AssetType {
  id: string;
  name: string;
  asset_account: string;
  asset_account_name: string;
  accum_dep_account: string;
  accum_dep_account_name: string;
  dep_expense_account: string;
  dep_expense_account_name: string;
  dep_method: 'StraightLine' | 'DiminishingValue';
  averaging_method: 'FullMonth' | 'ActualDays' | 'FullYear' | 'NoAveraging';
  rate: string | null;
  useful_life_years: string | null;
  residual_value_pct: string;
  is_active: boolean;
}

export interface DepRunLine {
  id: string;
  asset: string;
  asset_name: string;
  asset_number: string;
  asset_type_name: string;
  opening_nbv: string;
  dep_amount: string;
  closing_nbv: string;
}

export interface DepreciationRun {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: 'Posted' | 'Undone';
  lines?: DepRunLine[];
  line_count?: number;
  total_depreciation: string;
  created_at: string;
}

export interface DepRunPreview {
  period_label: string;
  period_start: string;
  period_end: string;
  total_depreciation: string;
  lines: Omit<DepRunLine, 'id' | 'asset'>[];
}

export interface FixedAsset {
  id: string;
  asset_number: string;
  name: string;
  description: string;
  serial_number: string;
  warranty_expiry: string | null;
  asset_type: string | null;
  asset_type_name: string;
  purchase_date: string;
  cost: string;
  residual_value: string;
  dep_start_date: string;
  rate: string | null;
  useful_life_years: string | null;
  status: 'Draft' | 'Registered' | 'Disposed';
  accumulated_depreciation: string;
  net_book_value: string;
  dep_lines: DepRunLine[];
  from_bill: boolean;
  disposed_date: string | null;
  disposed_amount: string | null;
  created_at: string;
}

// ---------- Email DTOs ----------
export interface SendEmailPayload {
  to: string;
  subject?: string;
  message?: string;
}

export interface SendBillEmailPayload {
  to: string;
  subject?: string;
  message?: string;
}

export interface SendPurchaseOrderEmailPayload {
  to: string;
  subject?: string;
  message?: string;
}
