const { performance } = require('perf_hooks');

const totalTasks = 10000;
const totalChildren = 500;

const state = {
  tasks: Array.from({ length: totalTasks }, (_, i) => ({
    id: `task-${i}`,
    completed: i % 2 === 0,
    linkedGoalId: `goal-${i % totalChildren}`,
    goalLinks: []
  })),
  goals: Array.from({ length: totalChildren }, (_, i) => ({
    id: `goal-${i}`,
    goalType: 'milestone',
    parentGoalId: 'parent-goal'
  }))
};

state.goals.push({
  id: 'parent-goal',
  goalType: 'milestone',
  parentGoalId: null
});

function beforeOptimization() {
  const goalId = 'parent-goal';
  const children = state.goals.filter(g => g.parentGoalId === goalId);
  let totalPercent = 0;
  let validChildrenCount = 0;

  for (const child of children) {
    if (child.goalType === 'continuous') continue;

    if (child.goalType === 'milestone') {
      const linkedTasks = state.tasks.filter(t => t.linkedGoalId === child.id || t.goalLinks.some(l => l.goalId === child.id));
      if (linkedTasks.length > 0) {
        const completed = linkedTasks.filter(t => t.completed).length;
        totalPercent += (completed / linkedTasks.length) * 100;
        validChildrenCount++;
      }
    }
  }
  return totalPercent / validChildrenCount;
}

function afterOptimization() {
  const goalId = 'parent-goal';
  const children = state.goals.filter(g => g.parentGoalId === goalId);

  // Simulation of useMemo map
  const stats = new Map();
  for (const task of state.tasks) {
    const goalIds = new Set();
    if (task.linkedGoalId) goalIds.add(task.linkedGoalId);
    if (task.goalLinks) {
      for (const link of task.goalLinks) goalIds.add(link.goalId);
    }
    for (const gId of goalIds) {
      let stat = stats.get(gId);
      if (!stat) {
        stat = { total: 0, completed: 0 };
        stats.set(gId, stat);
      }
      stat.total++;
      if (task.completed) stat.completed++;
    }
  }

  let totalPercent = 0;
  let validChildrenCount = 0;

  for (const child of children) {
    if (child.goalType === 'continuous') continue;

    if (child.goalType === 'milestone') {
      const stat = stats.get(child.id);
      if (stat && stat.total > 0) {
        totalPercent += (stat.completed / stat.total) * 100;
        validChildrenCount++;
      }
    }
  }
  return totalPercent / validChildrenCount;
}

const start1 = performance.now();
beforeOptimization();
const end1 = performance.now();
console.log(`Before optimization: ${end1 - start1} ms`);

const start2 = performance.now();
afterOptimization();
const end2 = performance.now();
console.log(`After optimization: ${end2 - start2} ms`);
