package db

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"cell-culture/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "5432"
	}
	if user == "" {
		user = "celluser"
	}
	if password == "" {
		password = "cellpass"
	}
	if dbname == "" {
		dbname = "cellculture"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		log.Println("Continuing without database persistence...")
		return
	}

	err = DB.AutoMigrate(
		&models.Player{},
		&models.Room{},
		&models.CultureEnvironment{},
		&models.CellPopulation{},
		&models.Mutation{},
		&models.SelectionPressure{},
		&models.Differentiation{},
		&models.Patent{},
		&models.Auction{},
		&models.Contract{},
		&models.Contamination{},
		&models.TurnLog{},
		&models.TurnSnapshot{},
		&models.ExperimentReport{},
		&models.ReportReview{},
		&models.ReviewVote{},
	)
	if err != nil {
		log.Printf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected successfully")
}

func GetPort() int {
	portStr := os.Getenv("WS_PORT")
	if portStr == "" {
		return 8080
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return 8080
	}
	return port
}
