# Payroll Module

## What this module actually does
The Payroll module is a new backend app that manages employee records, leave tracking, and pay run processing for an organization. It is the part of the app responsible for storing employee master data and turning a period's salaries and deductions into a posted ledger entry.

## Real user actions
- Add employees with employment, salary, and salary-account details.
- Terminate an employee (soft status change rather than deletion).
- Define leave types with an annual day entitlement.
- Submit a leave request for an employee and have business days calculated automatically.
- Approve or reject a pending leave request.
- Create a pay run for a period, which auto-populates a paycheque for every active employee.
- Edit paycheque gross salary and deduction lines while the pay run is in Draft.
- Post a pay run to generate the payroll journal entry.

## Inputs the user provides
- Employee ID, name, contact details, job title, department, employment type, and pay frequency
- Gross salary and the salary expense account for each employee
- Leave type name and days-per-year entitlement
- Leave request from-date, to-date, and reason
- Pay run period label, period start/end, pay date, and paying bank account
- Per-paycheque deduction lines with a label, amount, and ledger account

## Internal flow in the app
1. The frontend loads the employee list, leave types, and pay runs for the active organization.
2. Creating an employee auto-generates the next employee ID and creates a leave balance record for every active leave type.
3. Submitting a leave request counts weekday business days between the from and to dates.
4. Approving a leave request increases the employee's used-days balance for that leave type and year.
5. Creating a pay run copies each active employee's current gross salary into a paycheque.
6. Editing a Draft pay run recalculates each paycheque's net pay as gross salary minus its deduction lines.
7. Posting a pay run locks it, then generates a manual journal that debits each employee's salary account, credits each deduction account, and credits the bank account for total net pay.

## Outputs produced by the module
- Employee master records with live leave balances
- Leave request records with an approval trail
- Draft and Posted pay runs with computed gross, deductions, and net totals
- A manual journal entry per posted pay run, linked back to that pay run
- Payroll costs that flow into the organization's chart of accounts and financial reports

## Subpages
- [Employees](employees.md)
- [Leave Management](leave-management.md)
- [Pay Runs](pay-runs.md)
