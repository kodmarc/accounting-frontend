# Payroll — Employees

## What this page does
The Employees page is the staff master-data workflow. It lets the user register a new employee, keep their employment details current, and terminate them when they leave, without ever hard-deleting historical payroll records.

## Real user actions
- Open the employee list and filter it by status (Active/Terminated).
- Create a new employee with personal, employment, and salary details.
- Assign a salary expense account so pay runs know which ledger account to debit.
- Edit an existing employee's details.
- Terminate an employee, which sets an end date instead of removing the record.

## Inputs required from the user
- Full name, email, phone, and address
- Date of birth and job title/department (optional)
- Employment type (Full-time, Part-time, Contract) and pay frequency (Monthly, Fortnightly, Weekly)
- Start date and, on termination, an end date
- Gross salary and salary expense account
- Optional tax ID

## Internal app behavior
1. The page loads the organization's existing employees, accounts, and leave types.
2. On save, the backend generates the next sequential employee ID (e.g. `EMP-001`) for the organization.
3. A leave balance row is automatically created for every active leave type at the employee's default entitlement.
4. Terminating an employee sets status to Terminated and records the end date rather than deleting the record, preserving pay run history.

## Outputs
- A new or updated employee record scoped to the organization
- Auto-generated employee ID
- Initial leave balances for the current year
- Employee data available for selection when building a pay run

## Related modules
- [Leave Management](leave-management.md)
- [Pay Runs](pay-runs.md)
- [Chart of Accounts](../accounting/chart-of-accounts.md)
