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

	port := db.GetPort()
	log.Printf("Server starting on port %d", port)
	log.Printf("WebSocket endpoint: ws://localhost:%d/ws", port)

	if err := r.Run(fmt.Sprintf(":%d", port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
