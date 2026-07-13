# Payroll

## Files

`src/pages/tabs/PayrollTab.tsx`

## Sections

The tab has three internal sections toggled by a top nav: **Employees**, **Pay Runs**, and **Leave**.

## Employees

Lists all employees (Active and Terminated). Each employee record holds: full name, email, phone, address, date of birth, job title, department, employment type (`Full-time` / `Part-time` / `Contract`), start date, pay frequency (`Monthly` / `Fortnightly` / `Weekly`), gross salary, salary expense account, and tax ID.

Employee IDs are auto-generated (`EMP-001`, `EMP-002`, …). Clicking a row opens an inline detail view showing the employee's profile, leave balances for the current year, and leave request history.

**Terminating an employee** (DELETE) soft-deletes by setting `status = 'Terminated'` and recording `end_date`. Terminated employees remain visible with a Terminated badge and are excluded from new pay runs.

When a new employee is created, leave balances are automatically initialised for all active leave types for the current year.

## Leave

### Leave Types

Configurable leave categories per org (e.g. Annual Leave, Sick Leave). Each type has a name, days per year entitlement, and whether it is paid or unpaid. Leave types can be deactivated; active types are auto-applied to new employees.

### Leave Requests

Leave requests are submitted by selecting an employee, leave type, from date, and to date. The backend counts business days (Monday–Friday) between the dates and stores the `days` value. Requests start as `Pending`.

Approving a request (`POST /approve/`) moves it to `Approved` and deducts the days from the employee's leave balance for the year. Rejecting moves it to `Rejected` with no balance change.

## Pay Runs

### Creating a Pay Run

A pay run groups one period's pay for all active employees. The form takes: period label (e.g. "July 2026"), period start, period end, pay date, and bank account (used for the cash outflow journal line).

On creation, a `Paycheque` is automatically generated for every Active employee. Each paycheque starts with gross salary = employee's gross salary and net pay = gross salary (no deductions yet).

### Paycheque Deductions

Within a Draft pay run, each paycheque can have deduction lines added (e.g. tax, pension). Each deduction line has a label, amount, and expense/liability account. Net pay = gross salary − sum of deductions.

### Posting a Pay Run

Posting a pay run sets status to `Posted` and creates a `ManualJournal`:

- One **Debit** line per unique salary expense account for the total gross across employees using that account.
- One **Debit** line per unique deduction account for the total deductions to that account.
- One **Credit** line to the pay run's bank account for the total net pay (total gross − total deductions).

Only Draft pay runs can have paycheques edited. Posted pay runs are read-only.
