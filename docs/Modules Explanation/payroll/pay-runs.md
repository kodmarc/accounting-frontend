# Payroll — Pay Runs

## What this page does
The Pay Runs page is the actual salary-processing workflow. It groups a set of paycheques for a pay period, lets the user adjust gross pay and deductions while still Draft, and posts the run to create the payroll accounting entry.

## Real user actions
- Create a pay run for a period label, period start/end, pay date, and paying bank account.
- Review the auto-generated paycheque for every active employee.
- Edit a paycheque's gross salary and notes while the run is Draft.
- Add deduction lines to a paycheque, each with a label, amount, and ledger account.
- Delete a Draft pay run.
- Post a pay run once figures are finalized.

## Inputs required from the user
- Period label, period start date, period end date, and pay date
- Bank account the net salaries will be paid from
- Per-paycheque gross salary override and deduction lines (label, amount, account)

## Internal app behavior
1. Creating a pay run copies every Active employee's current gross salary into a new paycheque with net pay initially equal to gross.
2. While Draft, submitted paycheque edits replace each paycheque's deduction lines and recalculate net pay as gross minus total deductions; the pay run's totals are recalculated from all paycheques.
3. A pay run can be deleted only while Draft; it cannot be deleted or edited once Posted.
4. Posting requires at least one paycheque and locks in the totals.
5. Posting creates a manual journal that debits each employee's salary account for their gross salary, credits each deduction line's account, and credits the pay run's bank account for the total net pay.
6. The posted journal is linked back to the pay run through a one-to-one reference.

## Outputs
- A Draft or Posted pay run with total gross, total deductions, and total net figures
- Individual paycheques with net pay and deduction detail per employee
- A balanced manual journal entry recorded against the organization's ledger once posted

## Related modules
- [Employees](employees.md)
- [Manual Journals](../accounting/manual-journals.md)
- [Chart of Accounts](../accounting/chart-of-accounts.md)
