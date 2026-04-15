import { performance } from 'perf_hooks';
import { v4 as uuid } from 'uuid';

const NUM_GOALS = 10000;
const goals = [];
for (let i = 0; i < NUM_GOALS; i++) {
    goals.push({
        id: `goal-${i}`,
        goalType: 'measurable',
        currentValue: 10,
        entries: [],
    });
}

const state = { goals };
const goalIdToUpdate = `goal-${NUM_GOALS - 1}`; // Worst case scenario
const NUM_ITERATIONS = 1000;

function benchOldLogProgress() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                goalId: goalIdToUpdate,
                entry: { value: 5, date: '2023-01-01', id: 'entry-1', note: '' }
            }
        };
        const targetGoal = state.goals.find(g => g.id === action.payload.goalId);
        if (!targetGoal || targetGoal.goalType !== 'measurable') continue;
        const newState = {
            ...state,
            goals: state.goals.map(g =>
                g.id === action.payload.goalId
                    ? {
                        ...g,
                        currentValue: Math.max(0, g.currentValue + action.payload.entry.value),
                        entries: [...g.entries, action.payload.entry],
                    }
                    : g
            ),
        };
    }
    return performance.now() - start;
}

function benchOldLogProgressCorrection() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                goalId: goalIdToUpdate,
                delta: 5,
                note: 'Correction'
            }
        };
        const { goalId, delta, note } = action.payload;
        const correctionTarget = state.goals.find(g => g.id === goalId);
        if (!correctionTarget || correctionTarget.goalType !== 'measurable') continue;
        const correctionEntry = {
            id: 'mock-uuid',
            date: new Date().toISOString(),
            value: delta,
            note: note || 'Manual correction',
        };
        const newState = {
            ...state,
            goals: state.goals.map(g =>
                g.id === goalId
                    ? {
                        ...g,
                        currentValue: Math.max(0, g.currentValue + delta),
                        entries: [...g.entries, correctionEntry],
                    }
                    : g
            ),
        };
    }
    return performance.now() - start;
}

function benchOldUpdateGoal() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                id: goalIdToUpdate,
                goalType: 'measurable',
                currentValue: 15,
                entries: [],
            }
        };
        const newState = {
            ...state,
            goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g)
        };
    }
    return performance.now() - start;
}

console.log(`Baseline LOG_PROGRESS: ${benchOldLogProgress().toFixed(2)} ms`);
console.log(`Baseline LOG_PROGRESS_CORRECTION: ${benchOldLogProgressCorrection().toFixed(2)} ms`);
console.log(`Baseline UPDATE_GOAL: ${benchOldUpdateGoal().toFixed(2)} ms`);


function benchNewLogProgress() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                goalId: goalIdToUpdate,
                entry: { value: 5, date: '2023-01-01', id: 'entry-1', note: '' }
            }
        };
        const targetIndex = state.goals.findIndex(g => g.id === action.payload.goalId);
        if (targetIndex === -1) continue;
        const targetGoal = state.goals[targetIndex];
        if (targetGoal.goalType !== 'measurable') continue;

        const updatedGoal = {
            ...targetGoal,
            currentValue: Math.max(0, targetGoal.currentValue + action.payload.entry.value),
            entries: [...targetGoal.entries, action.payload.entry],
        };

        const newGoals = [...state.goals];
        newGoals[targetIndex] = updatedGoal;

        const newState = {
            ...state,
            goals: newGoals
        };
    }
    return performance.now() - start;
}

function benchNewLogProgressCorrection() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                goalId: goalIdToUpdate,
                delta: 5,
                note: 'Correction'
            }
        };
        const { goalId, delta, note } = action.payload;
        const targetIndex = state.goals.findIndex(g => g.id === goalId);
        if (targetIndex === -1) continue;
        const correctionTarget = state.goals[targetIndex];
        if (correctionTarget.goalType !== 'measurable') continue;
        const correctionEntry = {
            id: 'mock-uuid',
            date: new Date().toISOString(),
            value: delta,
            note: note || 'Manual correction',
        };

        const updatedGoal = {
            ...correctionTarget,
            currentValue: Math.max(0, correctionTarget.currentValue + delta),
            entries: [...correctionTarget.entries, correctionEntry],
        };

        const newGoals = [...state.goals];
        newGoals[targetIndex] = updatedGoal;

        const newState = {
            ...state,
            goals: newGoals
        };
    }
    return performance.now() - start;
}

function benchNewUpdateGoal() {
    let start = performance.now();
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const action = {
            payload: {
                id: goalIdToUpdate,
                goalType: 'measurable',
                currentValue: 15,
                entries: [],
            }
        };
        const targetIndex = state.goals.findIndex(g => g.id === action.payload.id);
        if (targetIndex === -1) {
            continue;
        }

        const newGoals = [...state.goals];
        newGoals[targetIndex] = action.payload;

        const newState = {
            ...state,
            goals: newGoals
        };
    }
    return performance.now() - start;
}

console.log(`Optimized LOG_PROGRESS: ${benchNewLogProgress().toFixed(2)} ms`);
console.log(`Optimized LOG_PROGRESS_CORRECTION: ${benchNewLogProgressCorrection().toFixed(2)} ms`);
console.log(`Optimized UPDATE_GOAL: ${benchNewUpdateGoal().toFixed(2)} ms`);
