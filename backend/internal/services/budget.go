package services

import (
	"sync"
	"time"
)

// DailyBudget is a process-wide, mutex-guarded daily request counter.
// It resets automatically when the UTC date changes.
// Inject a custom now function via newDailyBudgetWithClock for deterministic tests.
type DailyBudget struct {
	mu      sync.Mutex
	count   int
	day     string          // YYYY-MM-DD in UTC
	now     func() time.Time
}

const _dayFormat = "2006-01-02"

// NewDailyBudget returns a DailyBudget that uses the real wall clock.
func NewDailyBudget() *DailyBudget {
	return newDailyBudgetWithClock(time.Now)
}

// newDailyBudgetWithClock is a test helper that accepts an injectable clock.
func newDailyBudgetWithClock(now func() time.Time) *DailyBudget {
	return &DailyBudget{now: now}
}

// CheckAndIncrement reports whether the request is within the daily limit and
// increments the counter if so.
//
//   - limit <= 0 → unlimited; always returns true without counting.
//   - Returns true if the counter was below limit and has been incremented.
//   - Returns false if the counter has already reached limit (not incremented).
//   - Resets the counter to 0 when the current UTC date differs from the stored date.
func (b *DailyBudget) CheckAndIncrement(limit int) bool {
	if limit <= 0 {
		return true
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	today := b.now().UTC().Format(_dayFormat)
	if today != b.day {
		b.count = 0
		b.day = today
	}

	if b.count >= limit {
		return false
	}
	b.count++
	return true
}
