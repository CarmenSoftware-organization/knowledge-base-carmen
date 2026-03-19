// Run: go run scripts/sync_changelog.go
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// fixed list of changelog docs to sync
var changelogFiles = []string{
	"apr2025.md",
	"aug2024.md",
	"feb2026.md",
	"jan2025.md",
	"jul2025.md",
	"june2024.md",
	"mar2025.md",
	"mar2026.md",
	"may2024.md",
	"may2025.md",
	"nov2024.md",
	"nov2025.md",
	"sep2024.md",
	"sep2025.md",
}

const sourceBase = "https://raw.githubusercontent.com/llHorizonll/docscarmencloud/main/docs"
const sourceImagesBase = "https://raw.githubusercontent.com/llHorizonll/docscarmencloud/main/docs/_images"

func main() {
	// assume wiki root for carmen is ../carmen_cloud relative to backend/
	backendDir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	wikiRoot := filepath.Clean(filepath.Join(backendDir, "..", "carmen_cloud"))
	targetDir := filepath.Join(wikiRoot, "changelog")
	imagesRoot := filepath.Join(targetDir, "_images")

	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		log.Fatalf("create changelog dir failed: %v", err)
	}

	log.Printf("Syncing changelog docs into %s ...", targetDir)

	for _, name := range changelogFiles {
		srcURL := fmt.Sprintf("%s/%s", sourceBase, name)
		destPath := filepath.Join(targetDir, name)

		if err := downloadFile(srcURL, destPath); err != nil {
			log.Printf("[changelog] failed %s → %s: %v", srcURL, destPath, err)
			continue
		}
		log.Printf("[changelog] synced %s", name)

		// After syncing markdown, fetch referenced images (./_images/...)
		if err := syncImagesForMarkdown(destPath, imagesRoot); err != nil {
			log.Printf("[changelog] images for %s: %v", name, err)
		}
	}

	log.Println("Done. Run /api/wiki/sync or wait for webhook to reindex if needed.")
}

func downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, resp.Body)
	return err
}

// syncImagesForMarkdown parses a markdown file and downloads any images
// referenced with src="./_images/...".
func syncImagesForMarkdown(mdPath, imagesRoot string) error {
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return err
	}

	re := regexp.MustCompile(`src="\.(/_images/[^"]+)"`)
	matches := re.FindAllStringSubmatch(string(data), -1)
	if len(matches) == 0 {
		return nil
	}

	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		rel := strings.TrimPrefix(m[1], "/_images/")
		if rel == "" {
			continue
		}

		srcURL := fmt.Sprintf("%s/%s", sourceImagesBase, rel)
		destPath := filepath.Join(imagesRoot, filepath.FromSlash(rel))

		if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
			log.Printf("[changelog] mkdir images dir failed: %v", err)
			continue
		}

		if err := downloadFile(srcURL, destPath); err != nil {
			log.Printf("[changelog] download image failed %s → %s: %v", srcURL, destPath, err)
			continue
		}
	}

	return nil
}


