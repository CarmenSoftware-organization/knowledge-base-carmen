// Register, Login ใช้ storage — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"errors"

	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/storage"
	"github.com/new-carmen/backend/internal/utils"
)

type AuthService struct {
	userRepo *storage.UserRepository
}

func NewAuthService() *AuthService {
	return &AuthService{
		userRepo: storage.NewUserRepository(),
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (s *AuthService) Register(req RegisterRequest) (*AuthResponse, error) {
	// Check if user exists
	existing, _ := s.userRepo.GetByEmail(req.Email)
	if existing != nil {
		return nil, errors.New("user already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Name:         req.Name,
		Status:       "active",
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate token
	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	token, err := utils.GenerateToken(user.ID, user.Email, roles)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) Login(req LoginRequest) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	if user.Status != "active" {
		return nil, errors.New("account is not active")
	}

	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	token, err := utils.GenerateToken(user.ID, user.Email, roles)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}
