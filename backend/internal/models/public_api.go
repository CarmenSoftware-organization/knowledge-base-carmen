package models
type SystemStatusResponse struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}
