export const categoryDisplayMap: Record<string, string> = {
    ap: "Account Payable",
    ar: "Account Receivable",
    gl: "General Ledger",
    asset: "Asset",
    configuration: "Configuration",
    workbook: "Work Book",
    comment: "Comment & Document",
    dashboard: "Dashboard",
};

export const articleDisplayMap: Record<string, string> = {
    // Account Payable
    "AP-invoice": "Invoice",
    "AP-payment": "Payment",
    "AP-vendor": "Vendor Profile",
    "AP-apply_deposit_pay_with_inv": "Apply Deposit with Invoice",
    "AP-RDPrep_3": "RDPrep ภงด 3",
    "AP-RDPrep_53": "RDPrep ภงด 53",
    "AP-cheque_reconciliation": "Cheque Reconciliation",
    "AP-close_period": "Close Period AP",

    // General Ledger
    "c-journal_voucher": "Journal Voucher",
    "c-budget": "Budget",
    "c-close_period": "Close Period and Year End",

    // Configuration
    "CF-chart_of_account": "Chart of Accounts",
    "CF-permissions": "Permissions",
    "CF-users": "Users",
};

export function cleanTitle(title: string): string {
    if (!title) return "";

    let cleaned = title.replace(/^(AP|AR|GL|AS|ASSET|CF|WB|c)[- ]+/i, "").trim();

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return cleaned;
}