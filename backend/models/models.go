package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Player struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID     uuid.UUID `gorm:"type:uuid" json:"roomId"`
	Name       string    `json:"name"`
	Color      string    `json:"color"`
	Money      float64   `json:"money"`
	Score      float64   `json:"score"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (p *Player) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type CultureEnvironment struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID         uuid.UUID `gorm:"type:uuid" json:"playerId"`
	Glucose          float64   `json:"glucose"`
	Serum            float64   `json:"serum"`
	EssentialAA      bool      `json:"essentialAA"`
	NonEssentialAA   bool      `json:"nonEssentialAA"`
	EGF              float64   `json:"egf"`
	FGF              float64   `json:"fgf"`
	VEGF             float64   `json:"vegf"`
	NGF              float64   `json:"ngf"`
	PH               float64   `json:"ph"`
	Temperature      float64   `json:"temperature"`
	CO2              float64   `json:"co2"`
	CostPerTurn      float64   `json:"costPerTurn"`
}

func (ce *CultureEnvironment) BeforeCreate(tx *gorm.DB) error {
	if ce.ID == uuid.Nil {
		ce.ID = uuid.New()
	}
	return nil
}

type CellPopulation struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID        uuid.UUID `gorm:"type:uuid" json:"playerId"`
	TotalCells      float64   `json:"totalCells"`
	G1Phase         float64   `json:"g1Phase"`
	SPhase          float64   `json:"sPhase"`
	G2Phase         float64   `json:"g2Phase"`
	MPhase          float64   `json:"mPhase"`
	Capacity        float64   `json:"capacity"`
	BaseGrowthRate  float64   `json:"baseGrowthRate"`
	ApoptosisRate   float64   `json:"apoptosisRate"`
	HasStemCells    bool      `json:"hasStemCells"`
	StemCellRatio   float64   `json:"stemCellRatio"`
}

func (cp *CellPopulation) BeforeCreate(tx *gorm.DB) error {
	if cp.ID == uuid.Nil {
		cp.ID = uuid.New()
	}
	return nil
}

type Mutation struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID    uuid.UUID `gorm:"type:uuid" json:"playerId"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Frequency   float64   `json:"frequency"`
	Effect      float64   `json:"effect"`
	IsBeneficial bool     `json:"isBeneficial"`
	TurnCreated int       `json:"turnCreated"`
}

func (m *Mutation) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

type SelectionPressure struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID       uuid.UUID `gorm:"type:uuid" json:"playerId"`
	Antibiotic     string    `json:"antibiotic"`
	AntibioticConc float64   `json:"antibioticConc"`
	NutrientLimit  string    `json:"nutrientLimit"`
	HeatShock      bool      `json:"heatShock"`
	Hypoxia        bool      `json:"hypoxia"`
	Duration       int       `json:"duration"`
}

func (sp *SelectionPressure) BeforeCreate(tx *gorm.DB) error {
	if sp.ID == uuid.Nil {
		sp.ID = uuid.New()
	}
	return nil
}

type Differentiation struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID   uuid.UUID `gorm:"type:uuid" json:"playerId"`
	CellType   string    `json:"cellType"`
	Progress   int       `json:"progress"`
	TotalTurns int       `json:"totalTurns"`
	CellCount  float64   `json:"cellCount"`
	Complete   bool      `json:"complete"`
}

func (d *Differentiation) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

type Patent struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID    uuid.UUID `gorm:"type:uuid" json:"playerId"`
	Name        string    `json:"name"`
	MutationIDs []string  `gorm:"type:text[]" json:"mutationIds"`
	Income      float64   `json:"income"`
	TurnGranted int       `json:"turnGranted"`
}

func (p *Patent) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type Room struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `json:"name"`
	MaxPlayers  int       `json:"maxPlayers"`
	CurrentTurn int       `json:"currentTurn"`
	MaxTurns    int       `json:"maxTurns"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type Auction struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID     uuid.UUID `gorm:"type:uuid" json:"roomId"`
	ItemName   string    `json:"itemName"`
	ItemType   string    `json:"itemType"`
	Quantity   int       `json:"quantity"`
	TurnNumber int       `json:"turnNumber"`
	Status     string    `json:"status"`
	Bids       []Bid     `gorm:"-" json:"bids"`
}

type Bid struct {
	PlayerID uuid.UUID `json:"playerId"`
	Amount   float64   `json:"amount"`
}

func (a *Auction) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type Contract struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID      uuid.UUID `gorm:"type:uuid" json:"roomId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Reward      float64   `json:"reward"`
	Requirement string    `json:"requirement"`
	Completed   bool      `json:"completed"`
	WinnerID    uuid.UUID `gorm:"type:uuid" json:"winnerId"`
	TurnIssued  int       `json:"turnIssued"`
}

func (c *Contract) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type Contamination struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PlayerID        uuid.UUID `gorm:"type:uuid" json:"playerId"`
	SourcePlayerID  uuid.UUID `gorm:"type:uuid" json:"sourcePlayerId"`
	Type            string    `json:"type"`
	TurnsRemaining  int       `json:"turnsRemaining"`
	GrowthPenalty   float64   `json:"growthPenalty"`
}

func (c *Contamination) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type TurnLog struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID         uuid.UUID `gorm:"type:uuid;index" json:"roomId"`
	PlayerID       uuid.UUID `gorm:"type:uuid;index" json:"playerId"`
	TurnNumber     int       `json:"turnNumber"`
	OperationTypes []string  `gorm:"type:text[]" json:"operationTypes"`
	ActionSummary  string    `json:"actionSummary"`
	CellDelta      float64   `json:"cellDelta"`
	NewMutations   int       `json:"newMutations"`
	MoneyIncome    float64   `json:"moneyIncome"`
	MoneyExpense   float64   `json:"moneyExpense"`
	MoneyDelta     float64   `json:"moneyDelta"`
	EnvParams      string    `gorm:"type:text" json:"envParams"`
	PressureParams string    `gorm:"type:text" json:"pressureParams"`
	MutagenUsed    string    `json:"mutagenUsed"`
	MutagenTarget  string    `json:"mutagenTarget"`
	PassageUsed    bool      `json:"passageUsed"`
	PassageRatio   float64   `json:"passageRatio"`
	DiffStarted    string    `json:"diffStarted"`
	CreatedAt      time.Time `json:"createdAt"`
}

func (tl *TurnLog) BeforeCreate(tx *gorm.DB) error {
	if tl.ID == uuid.Nil {
		tl.ID = uuid.New()
	}
	return nil
}

type TurnSnapshot struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	RoomID         uuid.UUID `gorm:"type:uuid;index" json:"roomId"`
	TurnNumber     int       `json:"turnNumber"`
	PlayerStates   string    `gorm:"type:text" json:"playerStates"`
	CreatedAt      time.Time `json:"createdAt"`
}

func (ts *TurnSnapshot) BeforeCreate(tx *gorm.DB) error {
	if ts.ID == uuid.Nil {
		ts.ID = uuid.New()
	}
	return nil
}
