package game

import (
	"math"
	"math/rand"
	"time"

	"cell-culture/models"
)

type GameEngine struct {
	rand *rand.Rand
}

func NewGameEngine() *GameEngine {
	return &GameEngine{
		rand: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (ge *GameEngine) CalculateGrowthModifier(env *models.CultureEnvironment) float64 {
	totalModifier := 1.0

	glucoseOptimal := 25.0
	glucoseSigma := 15.0
	glucoseMod := gaussian(env.Glucose, glucoseOptimal, glucoseSigma)
	totalModifier *= glucoseMod

	serumOptimal := 10.0
	serumSigma := 8.0
	serumMod := gaussian(env.Serum, serumOptimal, serumSigma)
	totalModifier *= serumMod

	aaBonus := 1.0
	if env.EssentialAA {
		aaBonus += 0.15
	}
	if env.NonEssentialAA {
		aaBonus += 0.1
	}
	totalModifier *= aaBonus

	gfBonus := 1.0
	if env.EGF > 0 {
		gfBonus += 0.05 * math.Log10(env.EGF+1)
	}
	if env.FGF > 0 {
		gfBonus += 0.06 * math.Log10(env.FGF+1)
	}
	if env.VEGF > 0 {
		gfBonus += 0.04 * math.Log10(env.VEGF+1)
	}
	if env.NGF > 0 {
		gfBonus += 0.03 * math.Log10(env.NGF+1)
	}
	totalModifier *= gfBonus

	phOptimal := 7.4
	phSigma := 0.4
	phMod := gaussian(env.PH, phOptimal, phSigma)
	totalModifier *= phMod

	tempOptimal := 37.0
	tempSigma := 3.0
	tempMod := gaussian(env.Temperature, tempOptimal, tempSigma)
	totalModifier *= tempMod

	co2Optimal := 5.0
	co2Sigma := 3.0
	co2Mod := gaussian(env.CO2, co2Optimal, co2Sigma)
	totalModifier *= co2Mod

	if env.Serum >= 10 && env.EssentialAA && env.NonEssentialAA {
		totalModifier *= 1.2
	}

	if env.PH < 6.8 && env.Temperature > 39 {
		totalModifier *= 0.7
	}

	return totalModifier
}

func gaussian(x, mean, sigma float64) float64 {
	return math.Exp(-0.5 * math.Pow((x-mean)/sigma, 2))
}

func (ge *GameEngine) CalculateApoptosisRate(env *models.CultureEnvironment, pressure *models.SelectionPressure) float64 {
	baseRate := 0.03

	envStress := 1.0 - ge.CalculateGrowthModifier(env)
	if envStress > 0 {
		baseRate += envStress * 0.05
	}

	if pressure != nil {
		if pressure.Antibiotic != "" {
			baseRate += 0.3 * (pressure.AntibioticConc / 100.0)
		}
		if pressure.HeatShock {
			baseRate += 0.5
		}
		if pressure.Hypoxia {
			baseRate += 0.2
		}
		if pressure.NutrientLimit != "" {
			baseRate += 0.4
		}
	}

	return math.Min(baseRate, 0.9)
}

func (ge *GameEngine) SimulateCellCycle(
	pop *models.CellPopulation,
	env *models.CultureEnvironment,
	pressure *models.SelectionPressure,
	mutations []models.Mutation,
	contaminations []models.Contamination,
) (float64, float64) {
	growthMod := ge.CalculateGrowthModifier(env)

	mutationGrowthBonus := 0.0
	for _, mut := range mutations {
		if mut.Type == "growth_rate" && mut.IsBeneficial {
			mutationGrowthBonus += mut.Effect * mut.Frequency
		}
	}
	growthMod *= (1 + mutationGrowthBonus)

	contaminationPenalty := 1.0
	for _, cont := range contaminations {
		if cont.TurnsRemaining > 0 {
			contaminationPenalty *= (1 - cont.GrowthPenalty)
		}
	}
	growthMod *= contaminationPenalty

	apoptosisRate := ge.CalculateApoptosisRate(env, pressure)

	mutationDeathResist := 0.0
	for _, mut := range mutations {
		if mut.Type == "drug_resistance" && mut.IsBeneficial && pressure != nil && pressure.Antibiotic != "" {
			mutationDeathResist += mut.Effect * mut.Frequency
		}
		if mut.Type == "stress_resistance" && mut.IsBeneficial {
			mutationDeathResist += mut.Effect * mut.Frequency * 0.5
		}
	}
	effectiveDeathRate := apoptosisRate * (1 - mutationDeathResist)

	if env.Serum < 5.0 {
		return 0, effectiveDeathRate
	}

	baseG1toS := 0.3 * growthMod
	baseStoG2 := 0.4
	baseG2toM := 0.5
	baseMtoG1 := 0.6

	if env.EssentialAA {
		baseStoG2 *= 1.2
	}
	if env.NonEssentialAA {
		baseStoG2 *= 1.1
	}

	g1 := pop.G1Phase
	s := pop.SPhase
	g2 := pop.G2Phase
	m := pop.MPhase

	g1ToS := g1 * baseG1toS
	stoG2 := s * baseStoG2
	g2ToM := g2 * baseG2toM
	mToG1 := m * baseMtoG1
	newCells := mToG1

	totalBefore := g1 + s + g2 + m

	g1 = g1 - g1ToS + newCells
	s = s - stoG2 + g1ToS
	g2 = g2 - g2ToM + stoG2
	m = m - mToG1 + g2ToM

	totalAfter := g1 + s + g2 + m
	netGrowth := totalAfter - totalBefore

	apoptosisLoss := totalAfter * effectiveDeathRate
	totalAfter -= apoptosisLoss

	if pop.Capacity > 0 && totalAfter > pop.Capacity {
		excessRatio := pop.Capacity / totalAfter
		g1 *= excessRatio
		s *= excessRatio
		g2 *= excessRatio
		m *= excessRatio
		totalAfter = pop.Capacity
	}

	pop.G1Phase = g1
	pop.SPhase = s
	pop.G2Phase = g2
	pop.MPhase = m
	pop.TotalCells = totalAfter
	pop.BaseGrowthRate = growthMod
	pop.ApoptosisRate = effectiveDeathRate

	return netGrowth, apoptosisLoss
}

func (ge *GameEngine) CalculateDiversityIndex(mutations []models.Mutation) float64 {
	if len(mutations) == 0 {
		return 1.0
	}

	shannon := 0.0
	neutralFreq := 1.0

	for _, mut := range mutations {
		if mut.Frequency > 0 && mut.Frequency <= 1 {
			shannon -= mut.Frequency * math.Log(mut.Frequency)
			neutralFreq -= mut.Frequency
		}
	}

	if neutralFreq > 0 {
		shannon -= neutralFreq * math.Log(neutralFreq)
	}

	return shannon + 1
}

func (ge *GameEngine) CalculateFinalScore(
	pop *models.CellPopulation,
	mutations []models.Mutation,
	differentiations []models.Differentiation,
	patents []models.Patent,
	totalPatentIncome float64,
) float64 {
	diversity := ge.CalculateDiversityIndex(mutations)
	totalCells := pop.TotalCells

	functionalValue := 0.0
	for _, diff := range differentiations {
		if diff.Complete {
			switch diff.CellType {
			case "osteocyte":
				functionalValue += diff.CellCount * 2.0
			case "neuron":
				functionalValue += diff.CellCount * 3.0
			case "endothelial":
				functionalValue += diff.CellCount * 2.5
			}
		}
	}

	score := totalCells * diversity + functionalValue + totalPatentIncome*100

	return score
}

func (ge *GameEngine) CalculateEnvironmentCost(env *models.CultureEnvironment) float64 {
	cost := 50.0

	cost += env.Glucose * 0.5
	cost += env.Serum * 5.0

	if env.EssentialAA {
		cost += 30
	}
	if env.NonEssentialAA {
		cost += 20
	}

	cost += env.EGF * 0.8
	cost += env.FGF * 1.0
	cost += env.VEGF * 0.9
	cost += env.NGF * 1.2

	cost += (math.Abs(env.PH-7.4) / 0.1) * 2
	cost += (math.Abs(env.Temperature-37.0) / 0.5) * 3
	cost += (math.Abs(env.CO2-5.0) / 0.5) * 2

	return cost
}
