package game

import (
	"math"

	"cell-culture/models"
)

type DifferentiationProtocol struct {
	CellType    string
	DisplayName string
	TotalTurns  int
	Value       float64
	Requires    ProtocolRequirements
}

type ProtocolRequirements struct {
	GrowthFactors map[string]float64
	LowOxygen     bool
	StemCells     bool
}

var differentiationProtocols = map[string]DifferentiationProtocol{
	"osteocyte": {
		CellType:    "osteocyte",
		DisplayName: "骨细胞",
		TotalTurns:  3,
		Value:       2.0,
		Requires: ProtocolRequirements{
			GrowthFactors: map[string]float64{
				"BMP4": 10.0,
			},
			LowOxygen: false,
			StemCells: true,
		},
	},
	"neuron": {
		CellType:    "neuron",
		DisplayName: "神经元",
		TotalTurns:  4,
		Value:       3.0,
		Requires: ProtocolRequirements{
			GrowthFactors: map[string]float64{
				"RetinoicAcid": 1.0,
				"NGF":          10.0,
			},
			LowOxygen: false,
			StemCells: true,
		},
	},
	"endothelial": {
		CellType:    "endothelial",
		DisplayName: "内皮细胞",
		TotalTurns:  3,
		Value:       2.5,
		Requires: ProtocolRequirements{
			GrowthFactors: map[string]float64{
				"VEGF": 20.0,
			},
			LowOxygen: true,
			StemCells: true,
		},
	},
}

func (ge *GameEngine) GetDifferentiationProtocols() map[string]DifferentiationProtocol {
	return differentiationProtocols
}

func (ge *GameEngine) StartDifferentiation(
	pop *models.CellPopulation,
	env *models.CultureEnvironment,
	cellType string,
	cellCount float64,
) (*models.Differentiation, error) {
	protocol, exists := differentiationProtocols[cellType]
	if !exists {
		return nil, nil
	}

	if cellCount > pop.TotalCells {
		cellCount = pop.TotalCells
	}

	stemCellsAvailable := pop.TotalCells * pop.StemCellRatio
	if protocol.Requires.StemCells && stemCellsAvailable < cellCount {
		cellCount = stemCellsAvailable
	}

	if cellCount <= 0 {
		return nil, nil
	}

	pop.TotalCells -= cellCount
	ratio := cellCount / (pop.G1Phase + pop.SPhase + pop.G2Phase + pop.MPhase)
	pop.G1Phase *= (1 - ratio)
	pop.SPhase *= (1 - ratio)
	pop.G2Phase *= (1 - ratio)
	pop.MPhase *= (1 - ratio)

	diff := &models.Differentiation{
		PlayerID:   pop.PlayerID,
		CellType:   cellType,
		Progress:   0,
		TotalTurns: protocol.TotalTurns,
		CellCount:  cellCount,
		Complete:   false,
	}

	return diff, nil
}

func (ge *GameEngine) UpdateDifferentiation(
	diff *models.Differentiation,
	env *models.CultureEnvironment,
	mutations []models.Mutation,
) (bool, float64) {
	if diff.Complete {
		return true, 0
	}

	protocol := differentiationProtocols[diff.CellType]

	conditionsMet := true
	diffBonus := 1.0

	if protocol.Requires.LowOxygen && env.CO2 < 8 {
		conditionsMet = false
	}

	differentiationPotential := 0.0
	stemnessBonus := 0.0
	for _, mut := range mutations {
		if mut.Type == string(DifferentiationMutation) && mut.IsBeneficial {
			differentiationPotential += mut.Effect * mut.Frequency
		}
		if mut.Type == string(StemCellMutation) && mut.IsBeneficial {
			stemnessBonus += mut.Effect * mut.Frequency * 0.5
		}
	}
	diffBonus += differentiationPotential + stemnessBonus

	if !conditionsMet {
		apoptosisRate := 0.3
		cellsLost := diff.CellCount * apoptosisRate
		diff.CellCount -= cellsLost

		if diff.CellCount < 10 {
			diff.CellCount = 0
			return false, cellsLost
		}

		return false, cellsLost
	}

	diff.Progress++

	if diff.Progress >= diff.TotalTurns {
		diff.Complete = true
		return true, 0
	}

	return false, 0
}

func (ge *GameEngine) CheckPatentEligibility(mutations []models.Mutation) bool {
	beneficialCount := 0
	for _, mut := range mutations {
		if mut.IsBeneficial && mut.Frequency > 0.1 {
			beneficialCount++
		}
	}
	return beneficialCount >= 3
}

func (ge *GameEngine) CalculatePatentIncome(mutations []models.Mutation) float64 {
	beneficialCount := 0
	totalEffect := 0.0

	for _, mut := range mutations {
		if mut.IsBeneficial && mut.Frequency > 0.1 {
			beneficialCount++
			totalEffect += math.Abs(mut.Effect) * mut.Frequency
		}
	}

	if beneficialCount < 3 {
		return 0
	}

	baseIncome := 50.0
	bonusIncome := totalEffect * 200.0
	bonusForQuantity := float64(beneficialCount-3) * 30.0

	return baseIncome + bonusIncome + bonusForQuantity
}

func (ge *GameEngine) CheckContractCompletion(contract *models.Contract, pop *models.CellPopulation, mutations []models.Mutation) bool {
	if contract.Completed {
		return false
	}

	switch contract.Requirement {
	case "heat_resistant_growth":
		heatResist := 0.0
		for _, mut := range mutations {
			if mut.Type == string(StressResistanceMutation) && mut.IsBeneficial {
				heatResist += mut.Effect * mut.Frequency
			}
		}
		return heatResist > 0.3 && pop.TotalCells > 1e6

	case "high_diversity":
		diversity := 0
		typesSeen := make(map[string]bool)
		for _, mut := range mutations {
			if mut.Frequency > 0.05 {
				typesSeen[mut.Type] = true
			}
		}
		diversity = len(typesSeen)
		return diversity >= 4

	case "drug_resistant":
		for _, mut := range mutations {
			if mut.Type == string(DrugResistanceMutation) && mut.IsBeneficial && mut.Frequency > 0.5 {
				return true
			}
		}
		return false

	case "high_cell_count":
		return pop.TotalCells > 5e6

	case "stem_cells":
		return pop.HasStemCells && pop.StemCellRatio > 0.1
	}

	return false
}
