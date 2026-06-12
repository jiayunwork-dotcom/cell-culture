package cache

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var Ctx = context.Background()

func InitRedis() {
	host := os.Getenv("REDIS_HOST")
	port := os.Getenv("REDIS_PORT")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "6379"
	}

	addr := fmt.Sprintf("%s:%s", host, port)

	RedisClient = redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   0,
	})

	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
		log.Println("Continuing without Redis cache...")
		return
	}

	log.Println("Redis connected successfully")
}

func Get(key string) (string, error) {
	if RedisClient == nil {
		return "", fmt.Errorf("redis not available")
	}
	return RedisClient.Get(Ctx, key).Result()
}

func Set(key string, value interface{}, expiration int) error {
	if RedisClient == nil {
		return fmt.Errorf("redis not available")
	}
	return RedisClient.Set(Ctx, key, value, 0).Err()
}
