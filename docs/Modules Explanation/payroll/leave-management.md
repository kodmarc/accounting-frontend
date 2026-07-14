# Payroll — Leave Management

## What this page does
The Leave Management page covers leave type setup, employee leave balances, and the request/approve/reject workflow used to track time off against each employee's yearly entitlement.

## Real user actions
- Create a leave type with a name, annual day entitlement, and whether it is paid.
- Deactivate a leave type no longer in use.
- Submit a leave request for an employee across a date range with a reason.
- Filter leave requests by employee or status.
- Approve a pending leave request.
- Reject a pending leave request.

## Inputs required from the user
- Leave type name, days-per-year, and paid/unpaid flag
- Employee, leave type, from-date, to-date, and reason for a leave request
- Approval or rejection action on a pending request

## Internal app behavior
1. The page loads the organization's leave types and, for a given employee, their current leave balances.
2. When a leave request is submitted, the backend counts weekday business days between the from and to dates (weekends are excluded automatically).
3. New requests are created with status Pending.
4. Approving a request adds its day count to the employee's used-days balance for that leave type and year, creating the balance record if it doesn't already exist.
5. Rejecting a request simply changes its status without touching any balance.
6. Only Pending requests can be approved or rejected.

## Outputs
- Leave type definitions available when creating employees or requests
- Leave requests with a Pending, Approved, or Rejected status
- Updated remaining-days balance per employee, per leave type, per year

## Related modules
- [Employees](employees.md)
- [Pay Runs](pay-runs.md)
