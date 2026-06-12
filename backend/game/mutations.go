package game

import (
	"math"
	"math/rand"

	"cell-culture/models"
)

const (
	BaseMutationRate = 1e-6
)

type MutationType string

const (
	GrowthRateMutation      MutationType = "growth_rate"
	DrugResistanceMutation  MutationType = "drug_resistance"
	MetabolicMutation       MutationType = "metabolic"
	StemCellMutation        MutationType = "stemness"
	StressResistanceMutation MutationType = "stress_resistance"
	DifferentiationMutation MutationType = "differentiation"
)

type MutagenType string

const (
	NoMutagen   MutagenType = "none"
	UVMutagen   MutagenType = "uv"
	EMSMutagen  MutagenType = "ems"
	CRISPRMutagen MutagenType = "crispr"
)

type MutagenConfig struct {
	Type       MutagenType
	MutationMult float64
	DeathBonus float64
	TargetType MutationType
}

var mutationNames = map[MutationType][]string{
	GrowthRateMutation:      {"快速增殖", "慢周期", "高效代谢", "生长优势"},
	DrugResistanceMutation:  {"嘌呤霉素抗性", "G418抗性", "潮霉素抗性", "多药抗性"},
	MetabolicMutation:       {"Warburg效应", "有氧代谢增强", "氨基酸自合成", "糖酵解增强"},
	StemCellMutation:        {"干性增强", "多能性获得", "去分化", "端粒酶激活"},
	StressResistanceMutation: {"热耐受", "低氧适应", "pH抗性", "氧化应激抵抗"},
	DifferentiationMutation: {"成骨潜能", "神经分化潜能", "内皮分化潜能", "多谱系分化"},
}

func (ge *GameEngine) GetMutagenConfig(mutagen MutagenType, targetType MutationType) MutagenConfig {
	switch mutagen {
	case UVMutagen:
		return MutagenConfig{Type: UVMutagen, MutationMult: 100, DeathBonus: 0.25}
	case EMSMutagen:
		return MutagenConfig{Type: EMSMutagen, MutationMult: 50, DeathBonus: 0.15}
	case CRISPRMutagen:
		return MutagenConfig{Type: CRISPRMutagen, MutationMult: 5, DeathBonus: 0.05, TargetType: targetType}
	default:
		return MutagenConfig{Type: NoMutagen, MutationMult: 1, DeathBonus: 0}
	}
}

func (ge *GameEngine) SimulateMutations(
	pop *models.CellPopulation,
	mutations []models.Mutation,
	mutagen MutagenConfig,
	turnNumber int,
) []models.Mutation {
	effectiveRate := BaseMutationRate * mutagen.MutationMult
	totalCells := pop.TotalCells

	expectedNewMutations := totalCells * effectiveRate

	numNewMutations := poissonSample(expectedNewMutations, ge.rand)

	for i := 0; i < int(numNewMutations); i++ {
		var mutType MutationType

		if mutagen.Type == CRISPRMutagen && mutagen.TargetType != "" {
			mutType = mutagen.TargetType
		} else {
			types := []MutationType{
				GrowthRateMutation,
				DrugResistanceMutation,
				MetabolicMutation,
				StemCellMutation,
				StressResistanceMutation,
				DifferentiationMutation,
			}
			mutType = types[ge.rand.Intn(len(types))]
		}

		isBeneficial := ge.rand.Float64() < 0.3
		effect := ge.generateMutationEffect(mutType, isBeneficial)

		names := mutationNames[mutType]
		name := names[ge.rand.Intn(len(names))]

		initialFreq := 1.0 / math.Max(totalCells, 1)
		if initialFreq > 0.01 {
			initialFreq = 0.01
		}

		newMut := models.Mutation{
			PlayerID:     pop.PlayerID,
			Name:         name,
			Type:         string(mutType),
			Frequency:    initialFreq,
			Effect:       effect,
			IsBeneficial: isBeneficial,
			TurnCreated:  turnNumber,
		}

		mutations = append(mutations, newMut)
	}

	mutations = ge.updateMutationFrequencies(mutations, pop)

	mutations = ge.removeLostMutations(mutations)

	return mutations
}

func (ge *GameEngine) generateMutationEffect(mutType MutationType, isBeneficial bool) float64 {
	base := 0.1 + ge.rand.Float64()*0.2
	if !isBeneficial {
		base = -base
	}
	return base
}

func (ge *GameEngine) updateMutationFrequencies(mutations []models.Mutation, pop *models.CellPopulation) []models.Mutation {
	for i := range mutations {
		mut := &mutations[i]

		selectionCoeff := mut.Effect
		if !mut.IsBeneficial {
			selectionCoeff = -math.Abs(selectionCoeff) * 0.3
		}

		newFreq := mut.Frequency * (1 + selectionCoeff)

		if ge.rand.Float64() < 0.1 {
			drift := (ge.rand.Float64() - 0.5) * 0.01
			newFreq += drift
		}

		if newFreq > 0.99 {
			newFreq = 0.99
		}
		if newFreq < 0 {
			newFreq = 0
		}

		mut.Frequency = newFreq
	}

	return mutations
}

func (ge *GameEngine) removeLostMutations(mutations []models.Mutation) []models.Mutation {
	var filtered []models.Mutation
	for _, mut := range mutations {
		if mut.Frequency > 1e-6 {
			filtered = append(filtered, mut)
		}
	}
	return filtered
}

func (ge *GameEngine) ApplySelectionPressure(
	pop *models.CellPopulation,
	mutations []models.Mutation,
	pressure *models.SelectionPressure,
) float64 {
	if pressure == nil {
		return 0
	}

	totalDeath := 0.0

	if pressure.Antibiotic != "" && pressure.AntibioticConc > 0 {
		baseKillRate := 0.3 * (pressure.AntibioticConc / 100.0)
		resistanceLevel := 0.0

		for _, mut := range mutations {
			if mut.Type == string(DrugResistanceMutation) && mut.IsBeneficial {
				resistanceLevel += mut.Effect * mut.Frequency
			}
		}

		effectiveKillRate := baseKillRate * (1 - resistanceLevel)
		if effectiveKillRate < 0 {
			effectiveKillRate = 0
		}

		totalDeath += effectiveKillRate
	}

	if pressure.NutrientLimit != "" {
		canSynthesize := false
		for _, mut := range mutations {
			if mut.Type == string(MetabolicMutation) && mut.IsBeneficial {
				if mut.Frequency > 0.5 {
					canSynthesize = true
					break
				}
			}
		}

		if !canSynthesize {
			totalDeath += 0.5
		} else {
			totalDeath += 0.1
		}
	}

	if pressure.HeatShock {
		heatResistance := 0.0
		for _, mut := range mutations {
			if mut.Type == string(StressResistanceMutation) && mut.IsBeneficial {
				heatResistance += mut.Effect * mut.Frequency
			}
		}

		baseKill := 0.6
		effectiveKill := baseKill * (1 - heatResistance)
		if effectiveKill < 0 {
			effectiveKill = 0
		}
		totalDeath += effectiveKill
	}

	if pressure.Hypoxia {
		hypoxiaResistance := 0.0
		for _, mut := range mutations {
			if mut.Type == string(StressResistanceMutation) && mut.IsBeneficial {
				hypoxiaResistance += mut.Effect * mut.Frequency * 0.7
			}
			if mut.Type == string(MetabolicMutation) && mut.IsBeneficial {
				hypoxiaResistance += mut.Effect * mut.Frequency * 0.3
			}
		}

		baseKill := 0.3
		effectiveKill := baseKill * (1 - hypoxiaResistance)
		if effectiveKill < 0 {
			effectiveKill = 0
		}
		totalDeath += effectiveKill
	}

	totalDeath = math.Min(totalDeath, 0.95)

	cellsLost := pop.TotalCells * totalDeath
	pop.TotalCells -= cellsLost

	if pop.TotalCells < 100 {
		pop.TotalCells = 100
	}

	g1Ratio := pop.G1Phase / (pop.G1Phase + pop.SPhase + pop.G2Phase + pop.MPhase)
	sRatio := pop.SPhase / (pop.G1Phase + pop.SPhase + pop.G2Phase + pop.MPhase)
	g2Ratio := pop.G2Phase / (pop.G1Phase + pop.SPhase + pop.G2Phase + pop.MPhase)
	mRatio := pop.MPhase / (pop.G1Phase + pop.SPhase + pop.G2Phase + pop.MPhase)

	total := pop.TotalCells
	pop.G1Phase = total * g1Ratio
	pop.SPhase = total * sRatio
	pop.G2Phase = total * g2Ratio
	pop.MPhase = total * mRatio

	return cellsLost
}

func (ge *GameEngine) Passage(pop *models.CellPopulation, dilutionFactor float64) float64 {
	if dilutionFactor < 1 {
		dilutionFactor = 1
	}

	originalCells := pop.TotalCells
	pop.TotalCells = originalCells / dilutionFactor

	pop.G1Phase /= dilutionFactor
	pop.SPhase /= dilutionFactor
	pop.G2Phase /= dilutionFactor
	pop.MPhase /= dilutionFactor

	return originalCells - pop.TotalCells
}

func poissonSample(lambda float64, r *rand.Rand) float64 {
	if lambda < 30 {
		L := math.Exp(-lambda)
		k := 0.0
		p := 1.0
		for p > L {
			k++
			p *= r.Float64()
		}
		return k - 1
	}
	return math.Max(0, lambda+math.Sqrt(lambda)*r.NormFloat64())
}
