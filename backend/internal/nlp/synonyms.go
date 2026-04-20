package nlp

import (
	"strings"
)

// synonymMap maps Thai/English 
var synonymMap = map[string][]string{
	"ลูกหนี้":         {"AR", "Account Receivable", "ลูกหนี้การค้า"},
	"เจ้าหนี้":         {"AP", "Account Payable", "เจ้าหนี้การค้า"},
	"ใบเสร็จ":         {"Receipt", "AR Receipt", "ใบเสร็จรับเงิน"},
	"ใบกำกับ":         {"Invoice", "Tax Invoice", "ใบแจ้งหนี้"},
	"ใบแจ้งหนี้":      {"Invoice", "Tax Invoice", "AP Invoice"},
	"ภงด":            {"ภ.ง.ด.", "ภงด53", "ภาษี"},
	"บัญชีแยกประเภท": {"GL", "General Ledger"},
	"สินทรัพย์":       {"Asset", "AS"},
	"ap":             {"AP", "Account Payable", "เจ้าหนี้"},
	"ar":             {"AR", "Account Receivable", "ลูกหนี้"},
	"gl":             {"GL", "General Ledger", "บัญชีแยกประเภท"},
	"receipt":        {"Receipt", "ใบเสร็จ", "AR Receipt"},
	"invoice":        {"Invoice", "ใบกำกับ", "ใบแจ้งหนี้"},
	"configuration":  {"Configuration", "CF", "config"},
	"dashboard":      {"Dashboard", "สถิติ"},
	"vendor":         {"Vendor", "ผู้ขาย", "ร้านค้า"},
	"workbook":       {"Workbook", "Excel", "WB"},
	"asset-checker":  {"Asset Checker", "AS checker", "ตรวจสอบสินทรัพย์"},
	"comment":        {"Comment", "คอมเมนต์", "ความคิดเห็น"},
}


func ExpandQuery(query string) []string {
	preprocessed := Preprocess(query)
	if preprocessed == "" {
		return nil
	}
	seen := make(map[string]bool)
	var terms []string
	words := strings.Fields(preprocessed)
	for _, w := range words {
		if seen[w] {
			continue
		}
		seen[w] = true
		terms = append(terms, w)
		if len(w) >= 2 {
			if syns, ok := synonymMap[w]; ok {
				for _, s := range syns {
					if !seen[s] {
						seen[s] = true
						terms = append(terms, s)
					}
				}
			}
		}
	}
	return terms
}
