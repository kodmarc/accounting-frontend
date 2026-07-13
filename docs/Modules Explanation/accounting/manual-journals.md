# Accounting — Manual Journals

## What this page does
The Manual Journals page is the direct adjustment entry workflow. It allows the organization to create a balanced double-entry journal when a transaction cannot be represented by an invoice, bill, or bank movement alone.

## Real user actions
- Enter a narration for the journal.
- Choose a date and optional reference.
- Add two or more journal lines.
- Select an account for each line.
- Enter debit and credit value in the rows.
- Post the journal only when the total debits exactly match the total credits.

## Inputs required from the user
- Journal narration
- Journal date
- Optional reference
- One or more line items with account selection and either debit or credit amount

## Internal app behavior
1. The page loads organization accounts and pre-populates the first two rows.
2. The app enforces the rule that a row cannot have both debit and credit values set at the same time.
3. It checks whether the overall journal is balanced before allowing post submission.
4. If balanced, the backend receives the manual journal payload and stores it as a ledger adjustment.

## Outputs
- A posted manual journal entry with balanced debit and credit totals
- A new accounting record that affects the organization’s reporting data
- A supporting audit trail for correcting or adjusting financial activity

## Related modules
- [Chart of Accounts](chart-of-accounts.md)
- [Reports](../reports/README.md)
