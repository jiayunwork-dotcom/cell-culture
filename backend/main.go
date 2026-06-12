package main

import (
	"fmt"
	"log"
	"net/http"

	"cell-culture/cache"
	"cell-culture/db"
	"cell-culture/game"
	"cell-culture/models"
	"cell-culture/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found")
	}

	db.InitDB()
	cache.InitRedis()

	engine := game.NewGameEngine()
	roomManager := game.NewRoomManager(engine)
	hub := websocket.NewHub(roomManager)

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/ws", func(c *gin.Context) {
		hub.HandleWebSocket(c.Writer, c.Request)
	})

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	r.GET("/api/rooms", func(c *gin.Context) {
		rooms := roomManager.ListRooms()
		c.JSON(200, gin.H{
			"rooms": rooms,
		})
	})

	r.GET("/api/rooms/:roomId/timeline", func(c *gin.Context) {
		roomIDStr := c.Param("roomId")
		roomID, err := uuid.Parse(roomIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
			return
		}

		playerIDStr := c.Query("playerId")
		if playerIDStr != "" {
			playerID, err := uuid.Parse(playerIDStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
				return
			}
			var logs []models.TurnLog
			if db.DB != nil {
				db.DB.Where("room_id = ? AND player_id = ?", roomID, playerID).
					Order("turn_number ASC").
					Find(&logs)
			}
			c.JSON(200, gin.H{"timeline": logs})
			return
		}

		var logs []models.TurnLog
		if db.DB != nil {
			db.DB.Where("room_id = ?", roomID).
				Order("turn_number ASC, player_id ASC").
				Find(&logs)
		}
		c.JSON(200, gin.H{"timeline": logs})
	})

	r.GET("/api/rooms/:roomId/replay", func(c *gin.Context) {
		roomIDStr := c.Param("roomId")
		roomID, err := uuid.Parse(roomIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
			return
		}

		var snapshots []models.TurnSnapshot
		if db.DB != nil {
			db.DB.Where("room_id = ?", roomID).
				Order("turn_number ASC").
				Find(&snapshots)
		}

		var logs []models.TurnLog
		if db.DB != nil {
			db.DB.Where("room_id = ?", roomID).
				Order("turn_number ASC, player_id ASC").
				Find(&logs)
		}

		c.JSON(200, gin.H{
			"snapshots": snapshots,
			"timeline":  logs,
		})
	})

	r.POST("/api/reports", func(c *gin.Context) {
		var body struct {
			RoomID   string `json:"roomId" binding:"required"`
			PlayerID string `json:"playerId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		roomID, err := uuid.Parse(body.RoomID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
			return
		}

		playerID, err := uuid.Parse(body.PlayerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
			return
		}

		report, err := game.GenerateReport(roomID, playerID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(201, gin.H{"report": report})
	})

	r.GET("/api/reports/:reportId", func(c *gin.Context) {
		reportIDStr := c.Param("reportId")
		reportID, err := uuid.Parse(reportIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
			return
		}

		result, err := game.GetReportWithReviews(reportID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, result)
	})

	r.POST("/api/reports/:reportId/reviews", func(c *gin.Context) {
		reportIDStr := c.Param("reportId")
		reportID, err := uuid.Parse(reportIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
			return
		}

		var body struct {
			ReviewerID   string `json:"reviewerId" binding:"required"`
			ReviewerName string `json:"reviewerName" binding:"required"`
			Rating       int    `json:"rating" binding:"required"`
			Comment      string `json:"comment"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		reviewerID, err := uuid.Parse(body.ReviewerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reviewer ID"})
			return
		}

		review, err := game.AddReview(reportID, reviewerID, body.ReviewerName, body.Rating, body.Comment)
		if err != nil {
			if err.Error() == "you have already reviewed this report" {
				c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(201, gin.H{"review": review})
	})

	r.GET("/api/reports", func(c *gin.Context) {
		sortBy := c.DefaultQuery("sortBy", "time")
		cursor := c.Query("cursor")
		limit := 10

		var reviewerFilter *uuid.UUID
		reviewerIDStr := c.Query("reviewerId")
		if reviewerIDStr != "" {
			rid, err := uuid.Parse(reviewerIDStr)
			if err == nil {
				reviewerFilter = &rid
			}
		}

		result, err := game.ListReports(sortBy, cursor, limit, reviewerFilter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, result)
	})

	port := db.GetPort()
	log.Printf("Server starting on port %d", port)
	log.Printf("WebSocket endpoint: ws://localhost:%d/ws", port)

	if err := r.Run(fmt.Sprintf(":%d", port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
