// Run: go run scripts/check_embed_dim.go
package main

import (
	"fmt"
	"log"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	fmt.Println("=== Embedding Dimension Check ===")

	// 1. Expected (code constant)
	fmt.Printf("Code EmbeddingDim (utils): %d\n", utils.EmbeddingDim)

	// 2. Model output dimension
	client := ollama.NewEmbedClient()
	emb, err := client.Embedding("test")
	if err != nil {
		fmt.Printf("Ollama Embedding (model=%s): ERROR %v\n", config.AppConfig.Ollama.EmbedModel, err)
	} else {
		fmt.Printf("Ollama Embedding (model=%s): %d dimensions\n", config.AppConfig.Ollama.EmbedModel, len(emb))
		normalized := utils.TruncateEmbedding(emb)
		fmt.Printf("After TruncateEmbedding: %d dimensions\n", len(normalized))
	}

	// 3. DB schema - check carmen.document_chunks column type
	var colType string
	err = database.DB.Raw(`
		SELECT format_type(a.atttypid, a.atttypmod)
		FROM pg_attribute a
		JOIN pg_class c ON a.attrelid = c.oid
		JOIN pg_namespace n ON c.relnamespace = n.oid
		WHERE n.nspname = 'carmen' AND c.relname = 'document_chunks' AND a.attname = 'embedding' AND NOT a.attisdropped
	`).Scan(&colType).Error
	if err != nil {
		fmt.Printf("DB carmen.document_chunks.embedding type: ERROR %v\n", err)
	} else {
		fmt.Printf("DB carmen.document_chunks.embedding type: %s\n", colType)
	}

	// 3b. If rows exist, get actual vector dimension from data
	var vecDim *int
	database.DB.Raw(`SELECT vector_dims(embedding) FROM carmen.document_chunks LIMIT 1`).Scan(&vecDim)
	if vecDim != nil {
		fmt.Printf("DB sample row vector_dims: %d\n", *vecDim)
	} else {
		fmt.Println("DB sample row: (no rows - cannot check vector_dims)")
	}

	// 4. Row counts
	var docCount, chunkCount int64
	database.DB.Table("carmen.documents").Count(&docCount)
	database.DB.Table("carmen.document_chunks").Count(&chunkCount)
	fmt.Printf("\nRow counts: documents=%d, document_chunks=%d\n", docCount, chunkCount)

	if docCount > 0 && chunkCount == 0 {
		fmt.Println("⚠️  documents มีข้อมูล แต่ document_chunks ว่าง")
		fmt.Println("   รัน reindex: go run cmd/server/main.go reindex carmen")
	}
	fmt.Println("=== End ===")
}
