package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"cell-culture/game"
	"cell-culture/models"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	ID       uuid.UUID
	RoomID   uuid.UUID
	PlayerID uuid.UUID
	Conn     *websocket.Conn
	Send     chan []byte
}

type Hub struct {
	RoomManager *game.RoomManager
	clients     map[uuid.UUID]*Client
	rooms       map[uuid.UUID]map[uuid.UUID]*Client
	mu          sync.RWMutex
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func NewHub(rm *game.RoomManager) *Hub {
	return &Hub{
		RoomManager: rm,
		clients:     make(map[uuid.UUID]*Client),
		rooms:       make(map[uuid.UUID]map[uuid.UUID]*Client),
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		ID:   uuid.New(),
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	h.mu.Lock()
	h.clients[client.ID] = client
	h.mu.Unlock()

	go h.readPump(client)
	go h.writePump(client)
}

func (h *Hub) readPump(client *Client) {
	defer func() {
		h.removeClient(client)
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.handleMessage(client, message)
	}
}

func (h *Hub) writePump(client *Client) {
	defer client.Conn.Close()

	for message := range client.Send {
		err := client.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("WebSocket write error: %v", err)
			break
		}
	}
}

func (h *Hub) handleMessage(client *Client, message []byte) {
	var msg WSMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("JSON parse error: %v", err)
		return
	}

	switch msg.Type {
	case "join_room":
		h.handleJoinRoom(client, msg.Data)
	case "create_room":
		h.handleCreateRoom(client, msg.Data)
	case "list_rooms":
		h.handleListRooms(client)
	case "submit_action":
		h.handleSubmitAction(client, msg.Data)
	case "chat_message":
		h.handleChatMessage(client, msg.Data)
	case "place_bid":
		h.handlePlaceBid(client, msg.Data)
	case "start_game":
		h.handleStartGame(client)
	case "get_state":
		h.handleGetState(client)
	}
}

func (h *Hub) handleJoinRoom(client *Client, data interface{}) {
	dataBytes, _ := json.Marshal(data)
	var joinData struct {
		RoomID     string `json:"roomId"`
		PlayerName string `json:"playerName"`
		Color      string `json:"color"`
	}
	json.Unmarshal(dataBytes, &joinData)

	roomID, err := uuid.Parse(joinData.RoomID)
	if err != nil {
		h.sendError(client, "Invalid room ID")
		return
	}

	room, exists := h.RoomManager.GetRoom(roomID)
	if !exists {
		h.sendError(client, "Room not found")
		return
	}

	player, err := room.AddPlayer(joinData.PlayerName, joinData.Color)
	if err != nil {
		h.sendError(client, err.Error())
		return
	}

	if room.OnTurnEnd == nil {
		room.OnTurnEnd = func(rid uuid.UUID) {
			h.broadcastRoomState(rid)
		}
	}

	client.RoomID = roomID
	client.PlayerID = player.ID

	h.mu.Lock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[uuid.UUID]*Client)
	}
	h.rooms[roomID][client.ID] = client
	h.mu.Unlock()

	response := WSMessage{
		Type: "joined_room",
		Data: map[string]interface{}{
			"player": player,
			"room":   room.Room,
		},
	}
	h.sendToClient(client, response)

	h.broadcastRoomState(roomID)
}

func (h *Hub) handleCreateRoom(client *Client, data interface{}) {
	dataBytes, _ := json.Marshal(data)
	var createData struct {
		RoomName   string `json:"roomName"`
		MaxPlayers int    `json:"maxPlayers"`
		MaxTurns   int    `json:"maxTurns"`
		PlayerName string `json:"playerName"`
		Color      string `json:"color"`
	}
	json.Unmarshal(dataBytes, &createData)

	if createData.MaxPlayers < 4 {
		createData.MaxPlayers = 4
	}
	if createData.MaxPlayers > 6 {
		createData.MaxPlayers = 6
	}
	if createData.MaxTurns <= 0 {
		createData.MaxTurns = 20
	}

	room := h.RoomManager.CreateRoom(createData.RoomName, createData.MaxPlayers, createData.MaxTurns)
	player, err := room.AddPlayer(createData.PlayerName, createData.Color)
	if err != nil {
		h.sendError(client, err.Error())
		return
	}

	room.OnTurnEnd = func(roomID uuid.UUID) {
		h.broadcastRoomState(roomID)
	}

	client.RoomID = room.Room.ID
	client.PlayerID = player.ID

	h.mu.Lock()
	if h.rooms[room.Room.ID] == nil {
		h.rooms[room.Room.ID] = make(map[uuid.UUID]*Client)
	}
	h.rooms[room.Room.ID][client.ID] = client
	h.mu.Unlock()

	response := WSMessage{
		Type: "room_created",
		Data: map[string]interface{}{
			"player": player,
			"room":   room.Room,
		},
	}
	h.sendToClient(client, response)
}

func (h *Hub) handleListRooms(client *Client) {
	rooms := h.RoomManager.ListRooms()
	response := WSMessage{
		Type: "rooms_list",
		Data: rooms,
	}
	h.sendToClient(client, response)
}

func (h *Hub) handleSubmitAction(client *Client, data interface{}) {
	room, exists := h.RoomManager.GetRoom(client.RoomID)
	if !exists {
		h.sendError(client, "Room not found")
		return
	}

	dataBytes, _ := json.Marshal(data)
	var actionData struct {
		Environment     *models.CultureEnvironment `json:"environment"`
		Mutagen         string                     `json:"mutagen"`
		MutagenTarget   string                     `json:"mutagenTarget"`
		Selection       *models.SelectionPressure  `json:"selection"`
		StartDiff       *struct {
			CellType string  `json:"cellType"`
			Count    float64 `json:"count"`
		} `json:"startDiff"`
		Passage      bool    `json:"passage"`
		PassageRatio float64 `json:"passageRatio"`
		SubmitReady  bool    `json:"submitReady"`
	}

	if err := json.Unmarshal(dataBytes, &actionData); err != nil {
		h.sendError(client, "Invalid action data")
		return
	}

	action := &game.PlayerAction{
		PlayerID:      client.PlayerID,
		Environment:   actionData.Environment,
		Mutagen:       actionData.Mutagen,
		MutagenTarget: actionData.MutagenTarget,
		Selection:     actionData.Selection,
		Passage:       actionData.Passage,
		PassageRatio:  actionData.PassageRatio,
		SubmitReady:   actionData.SubmitReady,
	}

	if actionData.StartDiff != nil {
		action.DiffStart = &game.DiffStartAction{
			CellType: actionData.StartDiff.CellType,
			Count:    actionData.StartDiff.Count,
		}
	}

	if err := room.SubmitAction(client.PlayerID, action); err != nil {
		h.sendError(client, err.Error())
		return
	}

	h.broadcastRoomState(client.RoomID)
}

func (h *Hub) handleChatMessage(client *Client, data interface{}) {
	dataBytes, _ := json.Marshal(data)
	var chatData struct {
		Message string `json:"message"`
	}
	json.Unmarshal(dataBytes, &chatData)

	room, exists := h.RoomManager.GetRoom(client.RoomID)
	if !exists {
		return
	}

	playerState := room.Players[client.PlayerID]
	if playerState == nil {
		return
	}

	msg := game.ChatMessage{
		PlayerID:   client.PlayerID,
		PlayerName: playerState.Player.Name,
		Message:    chatData.Message,
	}

	room.Messages = append(room.Messages, msg)

	response := WSMessage{
		Type: "chat_message",
		Data: msg,
	}
	h.broadcastToRoom(client.RoomID, response)
}

func (h *Hub) handlePlaceBid(client *Client, data interface{}) {
	dataBytes, _ := json.Marshal(data)
	var bidData struct {
		AuctionID string  `json:"auctionId"`
		Amount    float64 `json:"amount"`
	}
	json.Unmarshal(dataBytes, &bidData)

	room, exists := h.RoomManager.GetRoom(client.RoomID)
	if !exists {
		h.sendError(client, "Room not found")
		return
	}

	auctionID, err := uuid.Parse(bidData.AuctionID)
	if err != nil {
		h.sendError(client, "Invalid auction ID")
		return
	}

	if err := room.PlaceBid(client.PlayerID, auctionID, bidData.Amount); err != nil {
		h.sendError(client, err.Error())
		return
	}

	h.broadcastRoomState(client.RoomID)
}

func (h *Hub) handleStartGame(client *Client) {
	room, exists := h.RoomManager.GetRoom(client.RoomID)
	if !exists {
		h.sendError(client, "Room not found")
		return
	}

	if err := room.StartGame(); err != nil {
		h.sendError(client, err.Error())
		return
	}

	h.broadcastRoomState(client.RoomID)
}

func (h *Hub) handleGetState(client *Client) {
	room, exists := h.RoomManager.GetRoom(client.RoomID)
	if !exists {
		h.sendError(client, "Room not found")
		return
	}

	state := h.buildRoomState(room, client.PlayerID)
	response := WSMessage{
		Type: "game_state",
		Data: state,
	}
	h.sendToClient(client, response)
}

func (h *Hub) buildRoomState(room *game.GameRoom, playerID uuid.UUID) map[string]interface{} {
	publicState := room.GetPublicState()

	playersRaw := publicState["players"].([]*models.Player)
	players := make([]map[string]interface{}, 0, len(playersRaw))
	for _, player := range playersRaw {
		playerData := map[string]interface{}{
			"id":    player.ID,
			"name":  player.Name,
			"color": player.Color,
			"score": player.Score,
			"money": player.Money,
		}
		if player.ID == playerID {
			playerData["isYou"] = true
		}
		players = append(players, playerData)
	}

	state := map[string]interface{}{
		"room":           publicState["room"],
		"players":        players,
		"submittedCount": publicState["submittedCount"],
		"contracts":      publicState["contracts"],
		"auctions":       publicState["auctions"],
		"messages":       publicState["messages"],
	}

	if playerID != uuid.Nil {
		playerData := room.GetPlayerData(playerID)
		if playerData != nil {
			state["environment"] = playerData["environment"]
			state["population"] = playerData["population"]
			state["mutations"] = playerData["mutations"]
			state["selection"] = playerData["selection"]
			state["differentiations"] = playerData["differentiations"]
			state["patents"] = playerData["patents"]
			state["contaminations"] = playerData["contaminations"]
		}
	}

	return state
}

func (h *Hub) broadcastRoomState(roomID uuid.UUID) {
	room, exists := h.RoomManager.GetRoom(roomID)
	if !exists {
		return
	}

	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()

	for _, client := range clients {
		state := h.buildRoomState(room, client.PlayerID)
		response := WSMessage{
			Type: "game_state",
			Data: state,
		}
		h.sendToClient(client, response)
	}
}

func (h *Hub) broadcastToRoom(roomID uuid.UUID, message WSMessage) {
	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()

	data, _ := json.Marshal(message)
	for _, client := range clients {
		select {
		case client.Send <- data:
		default:
		}
	}
}

func (h *Hub) sendToClient(client *Client, message WSMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}
	client.Send <- data
}

func (h *Hub) sendError(client *Client, errorMsg string) {
	response := WSMessage{
		Type: "error",
		Data: map[string]string{
			"message": errorMsg,
		},
	}
	h.sendToClient(client, response)
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	delete(h.clients, client.ID)
	if client.RoomID != uuid.Nil {
		if h.rooms[client.RoomID] != nil {
			delete(h.rooms[client.RoomID], client.ID)
		}
	}
	h.mu.Unlock()
}
