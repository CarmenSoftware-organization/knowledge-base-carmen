# AI

AI features in Carmen help users automate repetitive work, reduce manual data entry, and generate suggestions based on document data, transaction history, or configured business rules.

## At a Glance

Owner: Product / AI Team  
Used by: AP, GL, Finance, Operations  
Purpose: Assist users with data extraction, transaction suggestion, document automation, and accounting workflow support.

## What AI Does in Carmen

Carmen AI is used to support workflows such as:

- Suggesting actions or values based on existing data
- Extracting information from uploaded documents
- Automating invoice entry
- Assisting journal voucher creation
- Reducing manual checking and repetitive input

AI output should be treated as a suggestion or draft unless the specific workflow explicitly supports automatic posting or approval.

## AI Features

| Feature | Module | Description |
|---|---|---|
| [AI Suggestion](AI%20Suggestion.md) | General | Suggests values or actions based on context and system data. |
| [AP Invoice Automation](./ap/ap-invoice-automation.md) | AP | Extracts invoice information and helps create AP invoice records. |
| [GL JV Credit Card Commission](./gl/jv-credit-card-commission.md) | GL | Assists with journal voucher creation for credit card commission entries. |

## Common AI Workflow

1. User uploads or selects source data.
2. AI reads the available document or transaction context.
3. AI generates extracted data, suggested entries, or draft transactions.
4. User reviews the result.
5. User confirms, edits, rejects, or saves the output.
6. Carmen records the final user-confirmed transaction.

## Important Rules

- AI should not replace user review.
- AI-generated values must be editable before saving.
- Confidence, mismatch, or missing data should be clearly shown to the user.
- Final transaction records should store user-confirmed values, not raw AI assumptions.
- Any failed extraction or low-confidence result should allow manual entry.

## Related Modules

- [Accounts Payable](../ap/index.md)
- [General Ledger](../gl/index.md)
- [Configuration](../configuration/index.md)

## For QA / Testing

When testing AI features, verify:

- Source document upload or selection
- Data extraction accuracy
- Required field validation
- Manual edit after AI suggestion
- Save / reject / retry behavior
- Error handling for unreadable or incomplete documents
- Permission control by role
- Audit trail or activity log, if available