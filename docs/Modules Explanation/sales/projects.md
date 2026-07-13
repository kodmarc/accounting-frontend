# Sales — Projects

## What this page does
The Projects page is the account-level grouping screen for customer work or internal jobs. It does not create an invoice directly, but it gives the user a place to define a project, attach a code, and then review the project’s related revenue and purchase activity.

## Real user actions
- Create a project with a name and optional code.
- Edit or delete an existing project.
- View a project ledger showing all linked invoices and bills.
- Check project revenue, spending, and margin from the project detail screen.

## Inputs required from the user
- Project name
- Optional project code
- Organization context when the project is created
- Invoices or bills that later get linked to that project through the sales or purchase workflow

## Internal app behavior
1. The Projects tab loads projects, invoices, bills, and contacts.
2. The user creates a project record using the project modal.
3. In the detailed project view, the app gathers all invoices and bills assigned to the selected project.
4. It calculates project revenue, spending, and margin values from those linked records.

## Outputs
- A reusable project record that can be attached to quotes, invoices, and bills
- A project-level revenue/spending view for tracking job performance
- A margin summary for operational review and customer work monitoring

## Related modules
- [Invoices](invoices.md)
- [Quotes](quotes.md)
- [Sales Overview](overview.md)
