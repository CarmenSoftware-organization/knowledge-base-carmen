// User repository ใช้ database.DB — ยังไม่ใช้ (เปิดเมื่อมี DB)
package storage

import (
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		db: database.DB,
	}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) GetByID(id uint64) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Roles").First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Roles").Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id uint64) error {
	return r.db.Delete(&models.User{}, id).Error
}

func (r *UserRepository) AssignRole(userID uint64, roleID uint) error {
	return r.db.Exec(
		"INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
		userID, roleID,
	).Error
}

func (r *UserRepository) RemoveRole(userID uint64, roleID uint) error {
	return r.db.Exec(
		"DELETE FROM user_roles WHERE user_id = ? AND role_id = ?",
		userID, roleID,
	).Error
}
