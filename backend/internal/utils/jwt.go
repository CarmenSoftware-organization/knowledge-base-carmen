// JWT สร้าง/ตรวจ token ใช้โดย auth — ยังไม่ใช้ (เปิดเมื่อมี DB)
package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/new-carmen/backend/internal/config"
)

type Claims struct {
	UserID uint64   `json:"user_id"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint64, email string, roles []string) (string, error) {
	cfg := config.AppConfig.JWT

	expiry, err := time.ParseDuration(cfg.Expiry)
	if err != nil {
		expiry = 24 * time.Hour
	}

	claims := &Claims{
		UserID: userID,
		Email:  email,
		Roles:  roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Secret))
}

func ValidateToken(tokenString string) (*Claims, error) {
	cfg := config.AppConfig.JWT

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(cfg.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
