package services

import (
	"testing"
	"time"
)

func fixedClock(t time.Time) func() time.Time {
	return func() time.Time { return t }
}

func TestDailyBudget_AllowsUpToLimit(t *testing.T) {
	now := time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC)
	b := newDailyBudgetWithClock(fixedClock(now))
	limit := 3
	for i := 0; i < limit; i++ {
		if !b.CheckAndIncrement(limit) {
			t.Fatalf("call %d should be allowed", i+1)
		}
	}
	if b.CheckAndIncrement(limit) {
		t.Fatal("call beyond limit should be blocked")
	}
}

func TestDailyBudget_Unlimited(t *testing.T) {
	now := time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC)
	b := newDailyBudgetWithClock(fixedClock(now))
	for i := 0; i < 1000; i++ {
		if !b.CheckAndIncrement(0) {
			t.Fatalf("unlimited (limit=0) should always return true, failed at %d", i)
		}
	}
}

func TestDailyBudget_ResetsOnNewDay(t *testing.T) {
	day1 := time.Date(2024, 1, 15, 23, 59, 0, 0, time.UTC)
	day2 := time.Date(2024, 1, 16, 0, 0, 1, 0, time.UTC)

	current := day1
	clockFn := func() time.Time { return current }

	b := newDailyBudgetWithClock(clockFn)
	limit := 2

	// Use up limit on day1
	b.CheckAndIncrement(limit)
	b.CheckAndIncrement(limit)
	if b.CheckAndIncrement(limit) {
		t.Fatal("should be blocked on day1 after limit")
	}

	// Advance clock to day2
	current = day2
	if !b.CheckAndIncrement(limit) {
		t.Fatal("should be allowed on day2 after reset")
	}
}

func TestDailyBudget_LimitZeroNoCounting(t *testing.T) {
	now := time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC)
	b := newDailyBudgetWithClock(fixedClock(now))
	// limit=0 → unlimited, counter should stay 0 (no increment)
	b.CheckAndIncrement(0)
	b.CheckAndIncrement(0)
	// Now use with a real limit — should still allow full limit
	for i := 0; i < 5; i++ {
		if !b.CheckAndIncrement(5) {
			t.Fatalf("call %d should be allowed after unlimited calls", i+1)
		}
	}
	if b.CheckAndIncrement(5) {
		t.Fatal("should be blocked after limit=5 is reached")
	}
}
