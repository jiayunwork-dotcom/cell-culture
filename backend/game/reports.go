package game

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"time"

	"cell-culture/db"
	"cell-culture/models"

	"github.com/google/uuid"
)

type EnvEvolutionPoint struct {
	Turn       int     `json:"turn"`
	Glucose    float64 `json:"glucose"`
	Serum      float64 `json:"serum"`
	PH         float64 `json:"ph"`
	Temperature float64 `json:"temperature"`
	CO2        float64 `json:"co2"`
	EGF        float64 `json:"egf"`
	FGF        float64 `json:"fgf"`
	CostPerTurn float64 `json:"costPerTurn"`
}

type CellGrowthPoint struct {
	Turn         int     `json:"turn"`
	TotalCells   float64 `json:"totalCells"`
	CellDelta    float64 `json:"cellDelta"`
	ApoptosisRate float64 `json:"apoptosisRate"`
	BaseGrowthRate float64 `json:"baseGrowthRate"`
}

type MutationLineageEntry struct {
	TurnCreated  int     `json:"turnCreated"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Frequency    float64 `json:"frequency"`
	Effect       float64 `json:"effect"`
	IsBeneficial bool    `json:"isBeneficial"`
	Survived     bool    `json:"survived"`
}

type MutationCumulativePoint struct {
	Turn            int `json:"turn"`
	NewMutations    int `json:"newMutations"`
	TotalMutations  int `json:"totalMutations"`
	BeneficialCount int `json:"beneficialCount"`
}

type KeyTurningPoint struct {
	Turn         int     `json:"turn"`
	Impact       float64 `json:"impact"`
	Description  string  `json:"description"`
	OperationType string `json:"operationType"`
	CellDelta    float64 `json:"cellDelta"`
}

type StrategyAnalysis struct {
	Paragraphs []string `json:"paragraphs"`
}

func GenerateReport(roomID uuid.UUID, playerID uuid.UUID) (*models.ExperimentReport, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	var room models.Room
	if err := db.DB.Where("id = ?", roomID).First(&room).Error; err != nil {
		return nil, fmt.Errorf("room not found")
	}

	var player models.Player
	if err := db.DB.Where("id = ? AND room_id = ?", playerID, roomID).First(&player).Error; err != nil {
		return nil, fmt.Errorf("player not found")
	}

	var allPlayers []models.Player
	if err := db.DB.Where("room_id = ?", roomID).Find(&allPlayers).Error; err != nil {
		return nil, fmt.Errorf("failed to get players")
	}

	sort.Slice(allPlayers, func(i, j int) bool {
		return allPlayers[i].Score > allPlayers[j].Score
	})

	rank := 0
	for i, p := range allPlayers {
		if p.ID == playerID {
			rank = i + 1
			break
		}
	}

	var logs []models.TurnLog
	if err := db.DB.Where("room_id = ? AND player_id = ?", roomID, playerID).
		Order("turn_number ASC").
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to get turn logs")
	}

	var snapshots []models.TurnSnapshot
	if err := db.DB.Where("room_id = ?", roomID).
		Order("turn_number ASC").
		Find(&snapshots).Error; err != nil {
		return nil, fmt.Errorf("failed to get snapshots")
	}

	envEvolution := buildEnvEvolutionData(logs)
	cellGrowth := buildCellGrowthData(logs, snapshots, playerID)
	mutationLineage, mutationCumulative := buildMutationData(snapshots, playerID, room.MaxTurns)
	keyTurningPoints := findKeyTurningPoints(logs, cellGrowth)
	strategyAnalysis := generateStrategyAnalysis(logs, cellGrowth, mutationLineage, keyTurningPoints, player)

	envJSON, _ := json.Marshal(envEvolution)
	cellJSON, _ := json.Marshal(cellGrowth)
	lineageJSON, _ := json.Marshal(mutationLineage)
	cumulativeJSON, _ := json.Marshal(mutationCumulative)
	keyPointsJSON, _ := json.Marshal(keyTurningPoints)
	analysisJSON, _ := json.Marshal(strategyAnalysis)

	report := &models.ExperimentReport{
		RoomID:             roomID,
		PlayerID:           playerID,
		RoomName:           room.Name,
		PlayerName:         player.Name,
		PlayerColor:        player.Color,
		TotalTurns:         room.MaxTurns,
		FinalCellCount:     player.Score,
		FinalScore:         player.Score,
		Rank:               rank,
		EnvEvolutionData:   string(envJSON),
		CellGrowthData:     string(cellJSON),
		MutationLineage:    string(lineageJSON),
		MutationCumulative: string(cumulativeJSON),
		KeyTurningPoints:   string(keyPointsJSON),
		StrategyAnalysis:   string(analysisJSON),
		AvgRating:          0,
		ReviewCount:        0,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if len(cellGrowth) > 0 {
		report.FinalCellCount = cellGrowth[len(cellGrowth)-1].TotalCells
	}

	if err := db.DB.Create(report).Error; err != nil {
		return nil, fmt.Errorf("failed to create report: %v", err)
	}

	return report, nil
}

func buildEnvEvolutionData(logs []models.TurnLog) []EnvEvolutionPoint {
	points := make([]EnvEvolutionPoint, 0, len(logs))

	for _, log := range logs {
		var env models.CultureEnvironment
		if log.EnvParams != "" {
			if err := json.Unmarshal([]byte(log.EnvParams), &env); err == nil {
				points = append(points, EnvEvolutionPoint{
					Turn:         log.TurnNumber,
					Glucose:      env.Glucose,
					Serum:        env.Serum,
					PH:           env.PH,
					Temperature:  env.Temperature,
					CO2:          env.CO2,
					EGF:          env.EGF,
					FGF:          env.FGF,
					CostPerTurn:  env.CostPerTurn,
				})
			}
		}
	}

	return points
}

func buildCellGrowthData(logs []models.TurnLog, snapshots []models.TurnSnapshot, playerID uuid.UUID) []CellGrowthPoint {
	points := make([]CellGrowthPoint, 0)
	pidStr := playerID.String()

	for _, log := range logs {
		point := CellGrowthPoint{
			Turn:      log.TurnNumber,
			CellDelta: log.CellDelta,
		}

		for _, snap := range snapshots {
			if snap.TurnNumber == log.TurnNumber {
				var playerStates map[string]interface{}
				if err := json.Unmarshal([]byte(snap.PlayerStates), &playerStates); err == nil {
					if state, ok := playerStates[pidStr]; ok {
						if stateMap, ok := state.(map[string]interface{}); ok {
							if pop, ok := stateMap["population"]; ok {
								if popMap, ok := pop.(map[string]interface{}); ok {
									if tc, ok := popMap["totalCells"].(float64); ok {
										point.TotalCells = tc
									}
									if ar, ok := popMap["apoptosisRate"].(float64); ok {
										point.ApoptosisRate = ar
									}
									if bgr, ok := popMap["baseGrowthRate"].(float64); ok {
										point.BaseGrowthRate = bgr
									}
								}
							}
						}
					}
				}
				break
			}
		}

		points = append(points, point)
	}

	return points
}

func buildMutationData(snapshots []models.TurnSnapshot, playerID uuid.UUID, maxTurns int) ([]MutationLineageEntry, []MutationCumulativePoint) {
	pidStr := playerID.String()
	lineage := make([]MutationLineageEntry, 0)
	cumulative := make([]MutationCumulativePoint, 0)
	seenMutations := make(map[string]bool)
	totalMutations := 0
	beneficialCount := 0

	for turn := 1; turn <= maxTurns; turn++ {
		newThisTurn := 0
		beneficialThisTurn := 0

		for _, snap := range snapshots {
			if snap.TurnNumber == turn {
				var playerStates map[string]interface{}
				if err := json.Unmarshal([]byte(snap.PlayerStates), &playerStates); err == nil {
					if state, ok := playerStates[pidStr]; ok {
						if stateMap, ok := state.(map[string]interface{}); ok {
							if muts, ok := stateMap["mutations"]; ok {
								if mutArr, ok := muts.([]interface{}); ok {
									for _, m := range mutArr {
										if mutMap, ok := m.(map[string]interface{}); ok {
											var mutID string
											if id, ok := mutMap["id"].(string); ok {
												mutID = id
											}

											if mutID != "" && !seenMutations[mutID] {
												seenMutations[mutID] = true
												totalMutations++
												newThisTurn++

												name, _ := mutMap["name"].(string)
												mType, _ := mutMap["type"].(string)
												freq, _ := mutMap["frequency"].(float64)
												effect, _ := mutMap["effect"].(float64)
												isBen, _ := mutMap["isBeneficial"].(bool)
												turnCreated, _ := mutMap["turnCreated"].(float64)

												if isBen {
													beneficialCount++
													beneficialThisTurn++
												}

												lineage = append(lineage, MutationLineageEntry{
													TurnCreated:  int(turnCreated),
													Name:         name,
													Type:         mType,
													Frequency:    freq,
													Effect:       effect,
													IsBeneficial: isBen,
													Survived:     freq > 0.01,
												})
											}
										}
									}
								}
							}
						}
					}
				}
				break
			}
		}

		cumulative = append(cumulative, MutationCumulativePoint{
			Turn:            turn,
			NewMutations:    newThisTurn,
			TotalMutations:  totalMutations,
			BeneficialCount: beneficialCount,
		})
	}

	return lineage, cumulative
}

func findKeyTurningPoints(logs []models.TurnLog, growth []CellGrowthPoint) []KeyTurningPoint {
	points := make([]KeyTurningPoint, 0)

	for _, log := range logs {
		impact := math.Abs(log.CellDelta)
		if log.NewMutations > 0 {
			impact += float64(log.NewMutations) * 10000
		}

		desc := log.ActionSummary
		opType := "other"
		if len(log.OperationTypes) > 0 {
			opType = log.OperationTypes[0]
		}

		if log.MutagenUsed != "" && log.MutagenUsed != "none" {
			impact += 50000
			desc = fmt.Sprintf("使用诱变剂 %s", log.MutagenUsed)
		}
		if log.PassageUsed {
			impact += 30000
			desc = fmt.Sprintf("传代培养 1/%v", log.PassageRatio)
		}
		if log.DiffStarted != "" {
			impact += 20000
			desc = fmt.Sprintf("启动分化: %s", log.DiffStarted)
		}

		if impact > 10000 {
			points = append(points, KeyTurningPoint{
				Turn:         log.TurnNumber,
				Impact:       impact,
				Description:  desc,
				OperationType: opType,
				CellDelta:    log.CellDelta,
			})
		}
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Impact > points[j].Impact
	})

	if len(points) > 5 {
		points = points[:5]
	}

	sort.Slice(points, func(i, j int) bool {
		return points[i].Turn < points[j].Turn
	})

	return points
}

func generateStrategyAnalysis(
	logs []models.TurnLog,
	growth []CellGrowthPoint,
	lineage []MutationLineageEntry,
	keyPoints []KeyTurningPoint,
	player models.Player,
) StrategyAnalysis {
	paragraphs := make([]string, 0)

	if len(growth) > 0 {
		firstCells := growth[0].TotalCells
		lastCells := growth[len(growth)-1].TotalCells
		growthRate := 0.0
		if firstCells > 0 {
			growthRate = (lastCells - firstCells) / firstCells * 100
		}
		paragraphs = append(paragraphs, fmt.Sprintf(
			"本实验共进行%d回合，细胞数量从%.0f增长至%.0f，总体增长率为%.1f%%。最终评分为%.0f分。",
			len(growth), firstCells, lastCells, growthRate, player.Score,
		))
	}

	envAdjustCount := 0
	mutagenCount := 0
	passageCount := 0
	diffCount := 0
	for _, log := range logs {
		for _, op := range log.OperationTypes {
			switch op {
			case "env":
				envAdjustCount++
			case "mutagen":
				mutagenCount++
			case "passage":
				passageCount++
			case "diff":
				diffCount++
			}
		}
	}

	strategyParts := make([]string, 0)
	if envAdjustCount > 0 {
		strategyParts = append(strategyParts, fmt.Sprintf("%d次环境参数调整", envAdjustCount))
	}
	if mutagenCount > 0 {
		strategyParts = append(strategyParts, fmt.Sprintf("%d次诱变剂使用", mutagenCount))
	}
	if passageCount > 0 {
		strategyParts = append(strategyParts, fmt.Sprintf("%d次传代培养", passageCount))
	}
	if diffCount > 0 {
		strategyParts = append(strategyParts, fmt.Sprintf("%d次干细胞分化", diffCount))
	}

	if len(strategyParts) > 0 {
		paragraphs = append(paragraphs, "策略概览：实验过程中进行了"+joinStrs(strategyParts, "、")+"。")
	}

	beneficialCount := 0
	totalFreq := 0.0
	for _, mut := range lineage {
		if mut.IsBeneficial {
			beneficialCount++
		}
		if mut.Survived {
			totalFreq += mut.Frequency
		}
	}

	if len(lineage) > 0 {
		paragraphs = append(paragraphs, fmt.Sprintf(
			"突变分析：实验过程中共产生%d个突变，其中%d个为有益突变。存活突变的累积频率为%.1f%%。",
			len(lineage), beneficialCount, totalFreq*100,
		))
	}

	for _, kp := range keyPoints {
		detail := ""
		if kp.CellDelta > 0 {
			detail = fmt.Sprintf("，细胞数量增加了%.0f", kp.CellDelta)
		} else if kp.CellDelta < 0 {
			detail = fmt.Sprintf("，细胞数量减少了%.0f", -kp.CellDelta)
		}
		paragraphs = append(paragraphs, fmt.Sprintf(
			"关键转折点：第%d回合，%s%s。",
			kp.Turn, kp.Description, detail,
		))
	}

	totalCost := 0.0
	for _, log := range logs {
		totalCost += log.MoneyExpense
	}
	paragraphs = append(paragraphs, fmt.Sprintf(
		"经济分析：实验总支出为¥%.0f，剩余资金¥%.0f。",
		totalCost, player.Money,
	))

	return StrategyAnalysis{Paragraphs: paragraphs}
}

func joinStrs(parts []string, sep string) string {
	result := ""
	for i, p := range parts {
		if i > 0 {
			result += sep
		}
		result += p
	}
	return result
}

func GetReportWithReviews(reportID uuid.UUID) (map[string]interface{}, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	var report models.ExperimentReport
	if err := db.DB.Where("id = ?", reportID).First(&report).Error; err != nil {
		return nil, fmt.Errorf("report not found")
	}

	var reviews []models.ReportReview
	if err := db.DB.Where("report_id = ?", reportID).
		Order("created_at DESC").
		Find(&reviews).Error; err != nil {
		reviews = []models.ReportReview{}
	}

	result := map[string]interface{}{
		"report":  report,
		"reviews": reviews,
	}

	return result, nil
}

func AddReview(reportID uuid.UUID, reviewerID uuid.UUID, reviewerName string, rating int, comment string) (*models.ReportReview, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	if rating < 1 || rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	var existing int64
	db.DB.Model(&models.ReportReview{}).
		Where("report_id = ? AND reviewer_id = ?", reportID, reviewerID).
		Count(&existing)
	if existing > 0 {
		return nil, fmt.Errorf("you have already reviewed this report")
	}

	review := &models.ReportReview{
		ReportID:     reportID,
		ReviewerID:   reviewerID,
		ReviewerName: reviewerName,
		Rating:       rating,
		Comment:      comment,
		CreatedAt:    time.Now(),
	}

	if err := db.DB.Create(review).Error; err != nil {
		return nil, fmt.Errorf("failed to create review: %v", err)
	}

	var allReviews []models.ReportReview
	db.DB.Where("report_id = ?", reportID).Find(&allReviews)

	totalRating := 0
	for _, r := range allReviews {
		totalRating += r.Rating
	}

	avgRating := float64(totalRating) / float64(len(allReviews))

	db.DB.Model(&models.ExperimentReport{}).
		Where("id = ?", reportID).
		Updates(map[string]interface{}{
			"avg_rating":   avgRating,
			"review_count": len(allReviews),
			"updated_at":   time.Now(),
		})

	return review, nil
}

func ListReports(sortBy string, cursor string, limit int, reviewerFilter *uuid.UUID) (map[string]interface{}, error) {
	if db.DB == nil {
		return nil, fmt.Errorf("database not available")
	}

	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	query := db.DB.Model(&models.ExperimentReport{})

	if reviewerFilter != nil {
		subQuery := db.DB.Model(&models.ReportReview{}).
			Select("report_id").
			Where("reviewer_id = ?", *reviewerFilter)
		query = query.Where("id IN (?)", subQuery)
	}

	orderStr := "created_at DESC"
	if sortBy == "rating" {
		orderStr = "avg_rating DESC, review_count DESC, created_at DESC"
	}

	var cursorTime time.Time
	var cursorID uuid.UUID
	hasCursor := false
	if cursor != "" {
		parts := splitCursor(cursor)
		if len(parts) == 2 {
			if t, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
				cursorTime = t
				if id, err := uuid.Parse(parts[1]); err == nil {
					cursorID = id
					hasCursor = true
				}
			}
		}
	}

	if hasCursor {
		if sortBy == "rating" {
			var cursorReport models.ExperimentReport
			if err := db.DB.Where("id = ?", cursorID).First(&cursorReport).Error; err == nil {
				query = query.Where(
					"(avg_rating < ?) OR (avg_rating = ? AND review_count < ?) OR (avg_rating = ? AND review_count = ? AND created_at < ?) OR (avg_rating = ? AND review_count = ? AND created_at = ? AND id < ?)",
					cursorReport.AvgRating, cursorReport.AvgRating, cursorReport.ReviewCount,
					cursorReport.AvgRating, cursorReport.ReviewCount, cursorTime,
					cursorReport.AvgRating, cursorReport.ReviewCount, cursorTime, cursorID,
				)
			}
		} else {
			query = query.Where(
				"(created_at < ?) OR (created_at = ? AND id < ?)",
				cursorTime, cursorTime, cursorID,
			)
		}
	}

	var reports []models.ExperimentReport
	if err := query.Order(orderStr).Limit(limit + 1).Find(&reports).Error; err != nil {
		return nil, fmt.Errorf("failed to list reports: %v", err)
	}

	hasMore := len(reports) > limit
	if hasMore {
		reports = reports[:limit]
	}

	nextCursor := ""
	if hasMore && len(reports) > 0 {
		last := reports[len(reports)-1]
		nextCursor = fmt.Sprintf("%s_%s", last.CreatedAt.Format(time.RFC3339Nano), last.ID.String())
	}

	return map[string]interface{}{
		"reports":    reports,
		"nextCursor": nextCursor,
		"hasMore":    hasMore,
	}, nil
}

func splitCursor(cursor string) []string {
	parts := make([]string, 0, 2)
	lastUnderscore := -1
	for i := len(cursor) - 1; i >= 0; i-- {
		if cursor[i] == '_' {
			lastUnderscore = i
			break
		}
	}
	if lastUnderscore > 0 {
		parts = append(parts, cursor[:lastUnderscore])
		parts = append(parts, cursor[lastUnderscore+1:])
	}
	return parts
}
