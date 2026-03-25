package api

import "strings"

// topicPathRules maps keyword signals to ILIKE path patterns for vector search
// pre-filtering. Adding a new topic = add one entry here; no handler changes needed.
var topicPathRules = []struct {
	Keywords []string
	Patterns []string
}{
	{
		Keywords: []string{"vendor", "ap-vendor", "ผู้ขาย", "ร้านค้า"},
		Patterns: []string{"%vendor%", "%ผู้ขาย%", "%ร้านค้า%"},
	},
	{
		Keywords: []string{"configuration", "company profile", "chart of account", "department", "currency", "payment type", "permission", "cf-", "ตั้งค่า", "ผู้ใช้", "user"},
		Patterns: []string{"%configuration%", "%CF-%"},
	},
	{
		Keywords: []string{" ar ", "ar-", "ar invoice", "ar receipt", "ลูกค้า", "receipt", "contract", "folio", "ใบเสร็จ", "ลูกหนี้"},
		Patterns: []string{"%AR-%", "%/ar/%"},
	},
	{
		Keywords: []string{" ap ", "ap-", "ap invoice", "ap payment", "เจ้าหนี้", "cheque", "wht", "หัก ณ ที่จ่าย", "input tax", "ภาษีซื้อ"},
		Patterns: []string{"%AP-%", "%/ap/%"},
	},
	{
		Keywords: []string{"asset", "สินทรัพย์", "as-", "ทะเบียนสินทรัพย์", "asset register", "asset disposal"},
		Patterns: []string{"%AS-%", "%asset%"},
	},
	{
		Keywords: []string{" gl ", "gl ", "general ledger", "journal voucher", "voucher", "บัญชีแยกประเภท", "ผังบัญชี", "allocation", "amortization", "budget", "recurring"},
		Patterns: []string{"%gl%", "%c-%"},
	},
	{
		Keywords: []string{"dashboard", "สถิติ", "revenue", "occupancy", "adr", "revpar", "trevpar", "p&l", "กำไรขาดทุน"},
		Patterns: []string{"%dashboard%"},
	},
	{
		Keywords: []string{"workbook", "excel", "security", "formula", "function"},
		Patterns: []string{"%workbook%", "%WB-%", "%excel%"},
	},
	{
		Keywords: []string{"comment", "activity log", "document management", "ไฟล์แนบ", "รูปภาพแนบ", "ประวัติเอกสาร", "คอมเมนต์", "ความคิดเห็น"},
		Patterns: []string{"%comment%", "%CM-%"},
	},
}

// buildPathFilterFromQuestion returns (whereClause, args) for a parameterized
// vector-search query. Returns ("", nil) when no rule matches.
func buildPathFilterFromQuestion(question string) (string, []any) {
	qLower := strings.ToLower(question)
	for _, rule := range topicPathRules {
		for _, kw := range rule.Keywords {
			if strings.Contains(qLower, strings.ToLower(kw)) || strings.Contains(question, kw) {
				placeholders := make([]string, len(rule.Patterns))
				for i := range rule.Patterns {
					placeholders[i] = "d.path ILIKE ?"
				}
				args := make([]any, len(rule.Patterns))
				for i, p := range rule.Patterns {
					args[i] = p
				}
				return "WHERE (" + strings.Join(placeholders, " OR ") + ")", args
			}
		}
	}
	return "", nil
}
