// Payload ของ GitHub webhook — ยังไม่ใช้ (เปิดเมื่อมี DB + ลง route webhook)
package models

// GitHubPushPayload แทน payload หลักของ GitHub push event
type GitHubPushPayload struct {
	Ref        string                 `json:"ref"`
	Before     string                 `json:"before"`
	After      string                 `json:"after"`
	Repository GitHubRepository       `json:"repository"`
	Commits    []GitHubPushCommit     `json:"commits"`
	HeadCommit *GitHubPushCommit      `json:"head_commit,omitempty"`
	Pusher     map[string]interface{} `json:"pusher,omitempty"`
}

type GitHubRepository struct {
	FullName      string `json:"full_name"`
	DefaultBranch string `json:"default_branch"`
}

type GitHubPushCommit struct {
	ID        string   `json:"id"`
	Message   string   `json:"message"`
	Timestamp string   `json:"timestamp"`
	Added     []string `json:"added"`
	Removed   []string `json:"removed"`
	Modified  []string `json:"modified"`
}
