package game

import (
	"errors"
	"sync"
	"time"

	"cell-culture/models"

	"github.com/google/uuid"
)

type RoomManager struct {
	rooms    map[uuid.UUID]*GameRoom
	mu       sync.RWMutex
	engine   *GameEngine
}

type GameRoom struct {
	Room              *models.Room
	Players           map[uuid.UUID]*PlayerState
	Environments      map[uuid.UUID]*models.CultureEnvironment
	Populations       map[uuid.UUID]*models.CellPopulation
	Mutations         map[uuid.UUID][]models.Mutation
	Pressures         map[uuid.UUID]*models.SelectionPressure
	Differentiations  map[uuid.UUID][]*models.Differentiation
	Patents           map[uuid.UUID][]models.Patent
	Contaminations    map[uuid.UUID][]models.Contamination
	Contracts         []models.Contract
	Auctions          []models.Auction
	CurrentBids       map[uuid.UUID]map[uuid.UUID]float64
	Messages          []ChatMessage
	PlayerActions     map[uuid.UUID]*PlayerAction
	SubmittedCount    int
	mu                sync.RWMutex
	OnTurnEnd         func(roomID uuid.UUID)
}

type PlayerState struct {
	Player     *models.Player
	Connected  bool
	TotalPatentIncome float64
}

type PlayerAction struct {
	PlayerID        uuid.UUID
	Environment     *models.CultureEnvironment
	Mutagen         string
	MutagenTarget   string
	Selection       *models.SelectionPressure
	DiffStart       *DiffStartAction
	Passage         bool
	PassageRatio    float64
	BidAmount       float64
	AuctionID       uuid.UUID
	TradeOffer      *TradeOffer
	ContaminateTarget uuid.UUID
	SubmitReady     bool
}

type DiffStartAction struct {
	CellType string
	Count    float64
}

type TradeOffer struct {
	ToPlayerID uuid.UUID
	CellCount  float64
	Money      float64
	Accepted   bool
}

type ChatMessage struct {
	PlayerID  uuid.UUID
	PlayerName string
	Message   string
	Timestamp time.Time
}

type RandomEvent struct {
	Type        string
	Description string
	Effect      string
	TargetPlayer uuid.UUID
}

func NewRoomManager(engine *GameEngine) *RoomManager {
	return &RoomManager{
		rooms:  make(map[uuid.UUID]*GameRoom),
		engine: engine,
	}
}

func (rm *RoomManager) CreateRoom(name string, maxPlayers int, maxTurns int) *GameRoom {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room := &models.Room{
		ID:          uuid.New(),
		Name:        name,
		MaxPlayers:  maxPlayers,
		MaxTurns:    maxTurns,
		CurrentTurn: 0,
		Status:      "waiting",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	gameRoom := &GameRoom{
		Room:             room,
		Players:          make(map[uuid.UUID]*PlayerState),
		Environments:     make(map[uuid.UUID]*models.CultureEnvironment),
		Populations:      make(map[uuid.UUID]*models.CellPopulation),
		Mutations:        make(map[uuid.UUID][]models.Mutation),
		Pressures:        make(map[uuid.UUID]*models.SelectionPressure),
		Differentiations: make(map[uuid.UUID][]*models.Differentiation),
		Patents:          make(map[uuid.UUID][]models.Patent),
		Contaminations:   make(map[uuid.UUID][]models.Contamination),
		Contracts:        make([]models.Contract, 0),
		Auctions:         make([]models.Auction, 0),
		CurrentBids:      make(map[uuid.UUID]map[uuid.UUID]float64),
		Messages:         make([]ChatMessage, 0),
		PlayerActions:    make(map[uuid.UUID]*PlayerAction),
	}

	rm.rooms[room.ID] = gameRoom
	return gameRoom
}

func (rm *RoomManager) GetRoom(roomID uuid.UUID) (*GameRoom, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	room, exists := rm.rooms[roomID]
	return room, exists
}

func (rm *RoomManager) ListRooms() []*models.Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	rooms := make([]*models.Room, 0, len(rm.rooms))
	for _, gr := range rm.rooms {
		rooms = append(rooms, gr.Room)
	}
	return rooms
}

func (gr *GameRoom) AddPlayer(playerName string, color string) (*models.Player, error) {
	gr.mu.Lock()
	defer gr.mu.Unlock()

	if gr.Room.Status != "waiting" {
		return nil, errors.New("game already started")
	}

	if len(gr.Players) >= gr.Room.MaxPlayers {
		return nil, errors.New("room is full")
	}

	player := &models.Player{
		ID:        uuid.New(),
		Name:      playerName,
		Color:     color,
		Money:     1000,
		Score:     0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	gr.Players[player.ID] = &PlayerState{
		Player:            player,
		Connected:         true,
		TotalPatentIncome: 0,
	}

	gr.Environments[player.ID] = createDefaultEnvironment(player.ID)
	gr.Populations[player.ID] = createDefaultPopulation(player.ID)
	gr.Mutations[player.ID] = make([]models.Mutation, 0)
	gr.Pressures[player.ID] = &models.SelectionPressure{
		ID:       uuid.New(),
		PlayerID: player.ID,
	}
	gr.Differentiations[player.ID] = make([]*models.Differentiation, 0)
	gr.Patents[player.ID] = make([]models.Patent, 0)
	gr.Contaminations[player.ID] = make([]models.Contamination, 0)
	gr.PlayerActions[player.ID] = &PlayerAction{
		PlayerID: player.ID,
		Environment: gr.Environments[player.ID],
		Selection: gr.Pressures[player.ID],
	}

	return player, nil
}

func createDefaultEnvironment(playerID uuid.UUID) *models.CultureEnvironment {
	return &models.CultureEnvironment{
		ID:             uuid.New(),
		PlayerID:       playerID,
		Glucose:        25,
		Serum:          10,
		EssentialAA:    true,
		NonEssentialAA: true,
		EGF:            10,
		FGF:            10,
		VEGF:           0,
		NGF:            0,
		PH:             7.4,
		Temperature:    37,
		CO2:            5,
		CostPerTurn:    100,
	}
}

func createDefaultPopulation(playerID uuid.UUID) *models.CellPopulation {
	startCells := 100000.0
	return &models.CellPopulation{
		ID:             uuid.New(),
		PlayerID:       playerID,
		TotalCells:     startCells,
		G1Phase:        startCells * 0.5,
		SPhase:         startCells * 0.3,
		G2Phase:        startCells * 0.15,
		MPhase:         startCells * 0.05,
		Capacity:       10000000,
		BaseGrowthRate: 1.0,
		ApoptosisRate:  0.03,
		HasStemCells:   true,
		StemCellRatio:  0.1,
	}
}

func (gr *GameRoom) GetPlayerCount() int {
	gr.mu.RLock()
	defer gr.mu.RUnlock()
	return len(gr.Players)
}

func (gr *GameRoom) StartGame() error {
	gr.mu.Lock()
	defer gr.mu.Unlock()

	if len(gr.Players) < 4 {
		return errors.New("need at least 4 players")
	}

	gr.Room.Status = "playing"
	gr.Room.CurrentTurn = 1

	gr.generateContracts()
	gr.generateAuctions()

	return nil
}

func (gr *GameRoom) SubmitAction(playerID uuid.UUID, action *PlayerAction) error {
	gr.mu.Lock()
	defer gr.mu.Unlock()

	if gr.Room.Status != "playing" {
		return errors.New("game not in progress")
	}

	action.PlayerID = playerID
	gr.PlayerActions[playerID] = action

	if action.SubmitReady {
		gr.SubmittedCount++
	}

	if gr.SubmittedCount >= len(gr.Players) && len(gr.Players) >= 4 {
		go gr.processTurn()
	}

	return nil
}

func (gr *GameRoom) processTurn() {
	gr.mu.Lock()

	if gr.Room.Status != "playing" {
		gr.mu.Unlock()
		return
	}

	gr.applyPlayerActions()
	gr.simulateCellCycles()
	gr.simulateMutations()
	gr.applySelectionPressures()
	gr.updateDifferentiations()
	gr.updateContaminations()
	gr.checkPatents()
	gr.checkContracts()
	gr.processAuctions()
	gr.resolveEconomy()
	gr.triggerRandomEvents()
	gr.calculateScores()

	gr.Room.CurrentTurn++

	if gr.Room.CurrentTurn > gr.Room.MaxTurns {
		gr.Room.Status = "finished"
		roomID := gr.Room.ID
		gr.mu.Unlock()
		if gr.OnTurnEnd != nil {
			gr.OnTurnEnd(roomID)
		}
		return
	}

	gr.generateContracts()
	gr.generateAuctions()
	gr.SubmittedCount = 0

	for pid := range gr.PlayerActions {
		gr.PlayerActions[pid] = &PlayerAction{
			PlayerID:    uuid.UUID(pid),
			Environment: gr.Environments[uuid.UUID(pid)],
			Selection:   gr.Pressures[uuid.UUID(pid)],
			SubmitReady: false,
		}
	}

	roomID := gr.Room.ID
	gr.mu.Unlock()

	if gr.OnTurnEnd != nil {
		gr.OnTurnEnd(roomID)
	}
}

func (gr *GameRoom) applyPlayerActions() {
	engine := NewGameEngine()

	for playerID, action := range gr.PlayerActions {
		if action.Environment != nil {
			action.Environment.CostPerTurn = engine.CalculateEnvironmentCost(action.Environment)
			gr.Environments[playerID] = action.Environment
		}

		if action.Selection != nil {
			gr.Pressures[playerID] = action.Selection
		}

		if action.Passage {
			if action.PassageRatio < 2 {
				action.PassageRatio = 2
			}
			engine.Passage(gr.Populations[playerID], action.PassageRatio)
		}

		if action.DiffStart != nil {
			diff, err := engine.StartDifferentiation(
				gr.Populations[playerID],
				gr.Environments[playerID],
				action.DiffStart.CellType,
				action.DiffStart.Count,
			)
			if err == nil && diff != nil {
				gr.Differentiations[playerID] = append(gr.Differentiations[playerID], diff)
			}
		}

		if action.ContaminateTarget != uuid.Nil {
			cont := models.Contamination{
				PlayerID:       action.ContaminateTarget,
				SourcePlayerID: playerID,
				Type:           "mycoplasma",
				TurnsRemaining: 2,
				GrowthPenalty:  0.5,
			}
			gr.Contaminations[action.ContaminateTarget] = append(gr.Contaminations[action.ContaminateTarget], cont)
		}
	}
}

func (gr *GameRoom) simulateCellCycles() {
	engine := NewGameEngine()

	for playerID := range gr.Players {
		engine.SimulateCellCycle(
			gr.Populations[playerID],
			gr.Environments[playerID],
			gr.Pressures[playerID],
			gr.Mutations[playerID],
			gr.Contaminations[playerID],
		)
	}
}

func (gr *GameRoom) simulateMutations() {
	engine := NewGameEngine()

	for playerID, action := range gr.PlayerActions {
		mutagenType := MutagenType(action.Mutagen)
		targetType := MutationType(action.MutagenTarget)

		mutagenConfig := engine.GetMutagenConfig(mutagenType, targetType)

		if mutagenConfig.DeathBonus > 0 {
			gr.Populations[playerID].ApoptosisRate += mutagenConfig.DeathBonus
			if gr.Populations[playerID].ApoptosisRate > 1 {
				gr.Populations[playerID].ApoptosisRate = 1
			}
			deathLoss := gr.Populations[playerID].TotalCells * mutagenConfig.DeathBonus
			gr.Populations[playerID].TotalCells -= deathLoss
			if gr.Populations[playerID].TotalCells < 100 {
				gr.Populations[playerID].TotalCells = 100
			}
		}

		gr.Mutations[playerID] = engine.SimulateMutations(
			gr.Populations[playerID],
			gr.Mutations[playerID],
			mutagenConfig,
			gr.Room.CurrentTurn,
		)
	}
}

func (gr *GameRoom) applySelectionPressures() {
	engine := NewGameEngine()

	for playerID := range gr.Players {
		pressure := gr.Pressures[playerID]
		hasPressure := pressure.Antibiotic != "" || pressure.NutrientLimit != "" || pressure.HeatShock || pressure.Hypoxia

		if hasPressure {
			engine.ApplySelectionPressure(
				gr.Populations[playerID],
				gr.Mutations[playerID],
				pressure,
			)
		}
	}
}

func (gr *GameRoom) updateDifferentiations() {
	engine := NewGameEngine()

	for playerID := range gr.Players {
		activeDiffs := make([]*models.Differentiation, 0)
		for _, diff := range gr.Differentiations[playerID] {
			if !diff.Complete {
				complete, _ := engine.UpdateDifferentiation(
					diff,
					gr.Environments[playerID],
					gr.Mutations[playerID],
				)
				if complete {
					diff.Complete = true
				}
				if diff.CellCount > 0 {
					activeDiffs = append(activeDiffs, diff)
				}
			} else {
				activeDiffs = append(activeDiffs, diff)
			}
		}
		gr.Differentiations[playerID] = activeDiffs
	}
}

func (gr *GameRoom) updateContaminations() {
	for playerID := range gr.Players {
		activeConts := make([]models.Contamination, 0)
		for _, cont := range gr.Contaminations[playerID] {
			cont.TurnsRemaining--
			if cont.TurnsRemaining > 0 {
				activeConts = append(activeConts, cont)
			}
		}
		gr.Contaminations[playerID] = activeConts
	}
}

func (gr *GameRoom) checkPatents() {
	engine := NewGameEngine()

	for playerID := range gr.Players {
		mutations := gr.Mutations[playerID]

		if engine.CheckPatentEligibility(mutations) {
			income := engine.CalculatePatentIncome(mutations)

			existingPatents := len(gr.Patents[playerID])
			if existingPatents == 0 || gr.Patents[playerID][existingPatents-1].Income != income {
				mutationIDs := make([]string, 0)
				for _, mut := range mutations {
					if mut.IsBeneficial && mut.Frequency > 0.1 {
						mutationIDs = append(mutationIDs, mut.ID.String())
					}
				}

				patent := models.Patent{
					PlayerID:    playerID,
					Name:        "Cell Line #" + string(rune(existingPatents+1+'0')),
					MutationIDs: mutationIDs,
					Income:      income,
					TurnGranted: gr.Room.CurrentTurn,
				}
				gr.Patents[playerID] = append(gr.Patents[playerID], patent)
			}
		}
	}
}

func (gr *GameRoom) checkContracts() {
	for i := range gr.Contracts {
		contract := &gr.Contracts[i]
		if contract.Completed {
			continue
		}

		for playerID := range gr.Players {
			engine := NewGameEngine()
			if engine.CheckContractCompletion(contract, gr.Populations[playerID], gr.Mutations[playerID]) {
				contract.Completed = true
				contract.WinnerID = playerID
				gr.Players[playerID].Player.Money += contract.Reward
				break
			}
		}
	}
}

func (gr *GameRoom) generateContracts() {
	if len(gr.Contracts) >= 5 {
		return
	}

	contractTypes := []struct {
		Title       string
		Description string
		Requirement string
		Reward      float64
	}{
		{"耐热细胞系", "提供一株耐热且高增殖的细胞株", "heat_resistant_growth", 300},
		{"高多样性细胞库", "培养具有高度遗传多样性的细胞群体", "high_diversity", 400},
		{"抗生素抗性", "获得稳定的抗生素抗性细胞株", "drug_resistant", 350},
		{"大规模培养", "细胞总数达到500万", "high_cell_count", 250},
		{"干细胞富集", "获得高比例干细胞群体", "stem_cells", 500},
	}

	for _, ct := range contractTypes {
		exists := false
		for _, c := range gr.Contracts {
			if c.Title == ct.Title && !c.Completed {
				exists = true
				break
			}
		}
		if !exists {
			contract := models.Contract{
				RoomID:      gr.Room.ID,
				Title:       ct.Title,
				Description: ct.Description,
				Requirement: ct.Requirement,
				Reward:      ct.Reward,
				TurnIssued:  gr.Room.CurrentTurn,
			}
			gr.Contracts = append(gr.Contracts, contract)
		}
	}
}

func (gr *GameRoom) generateAuctions() {
	items := []struct {
		Name  string
		Type  string
		Qty   int
	}{
		{"稀有EGF因子", "egf", 1},
		{"高纯度FGF", "fgf", 1},
		{"CRISPR试剂盒", "crispr", 1},
	}

	if gr.Room.CurrentTurn%3 == 1 {
		for _, item := range items {
			auction := models.Auction{
				RoomID:     gr.Room.ID,
				ItemName:   item.Name,
				ItemType:   item.Type,
				Quantity:   item.Qty,
				TurnNumber: gr.Room.CurrentTurn,
				Status:     "active",
				Bids:       make([]models.Bid, 0),
			}
			gr.Auctions = append(gr.Auctions, auction)
			gr.CurrentBids[auction.ID] = make(map[uuid.UUID]float64)
		}
	}
}

func (gr *GameRoom) processAuctions() {
	activeAuctions := make([]models.Auction, 0)

	for _, auction := range gr.Auctions {
		if auction.Status != "active" {
			continue
		}

		bids := gr.CurrentBids[auction.ID]
		if len(bids) == 0 {
			auction.Status = "failed"
			continue
		}

		var winnerID uuid.UUID
		highestBid := 0.0
		for pid, amount := range bids {
			if amount > highestBid {
				highestBid = amount
				winnerID = pid
			}
		}

		player := gr.Players[winnerID].Player
		if player.Money >= highestBid {
			player.Money -= highestBid
			auction.Status = "completed"

			switch auction.ItemType {
			case "egf":
				gr.Environments[winnerID].EGF += 50
			case "fgf":
				gr.Environments[winnerID].FGF += 50
			case "crispr":
			}
		} else {
			auction.Status = "failed"
		}
	}

	gr.Auctions = activeAuctions
}

func (gr *GameRoom) resolveEconomy() {
	engine := NewGameEngine()

	for playerID, state := range gr.Players {
		envCost := engine.CalculateEnvironmentCost(gr.Environments[playerID])
		state.Player.Money -= envCost

		baseIncome := 100.0
		state.Player.Money += baseIncome

		patentIncome := engine.CalculatePatentIncome(gr.Mutations[playerID])
		state.Player.Money += patentIncome
		state.TotalPatentIncome += patentIncome

		if state.Player.Money < 0 {
			state.Player.Money = 0
		}
	}
}

func (gr *GameRoom) triggerRandomEvents() {
	if gr.Room.CurrentTurn < 2 {
		return
	}

	eventChance := 0.15
	if randFloat() < eventChance {
		eventTypes := []string{"incubator_failure", "reagent_expired", "contamination", "ethics_review"}
		eventType := eventTypes[int(randFloat()*float64(len(eventTypes)))]

		switch eventType {
		case "incubator_failure":
			targetID := gr.randomPlayer()
			if targetID != uuid.Nil {
				gr.Populations[targetID].TotalCells *= 0.7
			}
		case "reagent_expired":
			targetID := gr.randomPlayer()
			if targetID != uuid.Nil {
				gr.Players[targetID].Player.Money -= 100
				if gr.Players[targetID].Player.Money < 0 {
					gr.Players[targetID].Player.Money = 0
				}
			}
		case "contamination":
			targetID := gr.randomPlayer()
			if targetID != uuid.Nil {
				cont := models.Contamination{
					PlayerID:       targetID,
					SourcePlayerID: uuid.Nil,
					Type:           "bacterial",
					TurnsRemaining: 2,
					GrowthPenalty:  0.3,
				}
				gr.Contaminations[targetID] = append(gr.Contaminations[targetID], cont)
			}
		case "ethics_review":
			targetID := gr.randomPlayer()
			if targetID != uuid.Nil {
				gr.Players[targetID].Player.Money += 200
			}
		}
	}
}

func (gr *GameRoom) randomPlayer() uuid.UUID {
	players := make([]uuid.UUID, 0, len(gr.Players))
	for pid := range gr.Players {
		players = append(players, pid)
	}
	if len(players) == 0 {
		return uuid.Nil
	}
	return players[int(randFloat()*float64(len(players)))]
}

func (gr *GameRoom) calculateScores() {
	engine := NewGameEngine()

	for playerID, state := range gr.Players {
		diffList := make([]models.Differentiation, 0)
		for _, d := range gr.Differentiations[playerID] {
			diffList = append(diffList, *d)
		}

		score := engine.CalculateFinalScore(
			gr.Populations[playerID],
			gr.Mutations[playerID],
			diffList,
			gr.Patents[playerID],
			state.TotalPatentIncome,
		)
		state.Player.Score = score
	}
}

func randFloat() float64 {
	return float64(time.Now().UnixNano()%1000000) / 1000000.0
}

func (gr *GameRoom) PlaceBid(playerID uuid.UUID, auctionID uuid.UUID, amount float64) error {
	gr.mu.Lock()
	defer gr.mu.Unlock()

	if gr.Room.Status != "playing" {
		return errors.New("game not in progress")
	}

	bids, exists := gr.CurrentBids[auctionID]
	if !exists {
		return errors.New("auction not found")
	}

	player := gr.Players[playerID].Player
	if player.Money < amount {
		return errors.New("not enough money")
	}

	bids[playerID] = amount
	return nil
}

func (gr *GameRoom) GetPlayerState(playerID uuid.UUID) (*models.Player, *models.CultureEnvironment, *models.CellPopulation, []models.Mutation) {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	return gr.Players[playerID].Player,
		gr.Environments[playerID],
		gr.Populations[playerID],
		gr.Mutations[playerID]
}

func (gr *GameRoom) GetAllPlayers() []*models.Player {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	players := make([]*models.Player, 0, len(gr.Players))
	for _, state := range gr.Players {
		players = append(players, state.Player)
	}
	return players
}

func (gr *GameRoom) GetSubmittedCount() int {
	gr.mu.RLock()
	defer gr.mu.RUnlock()
	return gr.SubmittedCount
}

func (gr *GameRoom) GetPlayerData(playerID uuid.UUID) map[string]interface{} {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	playerState := gr.Players[playerID]
	if playerState == nil {
		return nil
	}

	diffs := make([]*models.Differentiation, 0)
	for _, d := range gr.Differentiations[playerID] {
		diffs = append(diffs, d)
	}

	return map[string]interface{}{
		"player":          playerState.Player,
		"environment":     gr.Environments[playerID],
		"population":      gr.Populations[playerID],
		"mutations":       gr.Mutations[playerID],
		"selection":       gr.Pressures[playerID],
		"differentiations": diffs,
		"patents":         gr.Patents[playerID],
		"contaminations":  gr.Contaminations[playerID],
	}
}

func (gr *GameRoom) GetPublicState() map[string]interface{} {
	gr.mu.RLock()
	defer gr.mu.RUnlock()

	players := make([]*models.Player, 0, len(gr.Players))
	for _, state := range gr.Players {
		players = append(players, state.Player)
	}

	return map[string]interface{}{
		"room":           gr.Room,
		"players":        players,
		"submittedCount": gr.SubmittedCount,
		"contracts":      gr.Contracts,
		"auctions":       gr.Auctions,
		"messages":       gr.Messages,
	}
}
