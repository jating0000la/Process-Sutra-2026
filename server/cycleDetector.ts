/**
 * Flow Rule Cycle Detection
 * 
 * Prevents circular dependencies in workflow rules using Depth-First Search (DFS)
 * 
 * Example cycles:
 * - Self-reference: Task A → Task A
 * - Two-step: Task A → Task B → Task A
 * - Multi-step: Task A → Task B → Task C → Task D → Task B
 */

interface FlowRule {
  id: string;
  system: string;
  currentTask: string | null;
  status: string | null;
  nextTask: string;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycle?: string[];
  message?: string;
}

/**
 * Detects if adding a new flow rule would create a circular dependency
 * 
 * @param existingRules - All existing flow rules for the system
 * @param newRule - The new rule being added
 * @returns Result object with cycle detection info
 */
export function detectCycle(
  existingRules: FlowRule[],
  newRule: { currentTask: string; nextTask: string; status: string }
): CycleDetectionResult {
  // Check for self-reference (simplest cycle)
  if (newRule.currentTask === newRule.nextTask && newRule.currentTask !== "") {
    return {
      hasCycle: true,
      cycle: [newRule.currentTask, newRule.nextTask],
      message: `Self-referencing rule detected: Task "${newRule.currentTask}" points to itself. This would create an infinite loop.`
    };
  }
  
  // Build adjacency list graph
  // Key format: "taskName:status" to handle conditional branching
  const graph = new Map<string, Set<string>>();
  
  // Add existing rules to graph
  existingRules.forEach(rule => {
    // Skip start rules (empty or null currentTask)
    if (!rule.currentTask || rule.currentTask === "") return;
    
    const status = rule.status || "";
    const key = `${rule.currentTask}:${status}`;
    if (!graph.has(key)) {
      graph.set(key, new Set());
    }
    if (rule.nextTask) {
      graph.get(key)!.add(rule.nextTask);
    }
  });
  
  // Add new rule to graph
  if (newRule.currentTask !== "") {
    const newKey = `${newRule.currentTask}:${newRule.status}`;
    if (!graph.has(newKey)) {
      graph.set(newKey, new Set());
    }
    if (newRule.nextTask) {
      graph.get(newKey)!.add(newRule.nextTask);
    }
  }
  
  // DFS to detect cycles starting from the new rule's next task
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(taskName: string): boolean {
    if (taskName === "") return false; // Skip empty tasks (end points)
    
    visited.add(taskName);
    recursionStack.add(taskName);
    path.push(taskName);
    
    // Check all possible next steps from this task (all statuses)
    const graphEntries = Array.from(graph.entries());
    for (const [key, neighbors] of graphEntries) {
      const [currentTask] = key.split(':');
      if (currentTask !== taskName) continue;
      
      const neighborArray = Array.from(neighbors);
      for (const neighbor of neighborArray) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected! Build the cycle path
          const cycleStartIndex = path.indexOf(neighbor);
          const cyclePath = path.slice(cycleStartIndex);
          cyclePath.push(neighbor);
          
          path.length = 0;
          path.push(...cyclePath);
          return true;
        }
      }
    }
    
    recursionStack.delete(taskName);
    path.pop();
    return false;
  }
  
  // Start DFS from the new rule's next task
  if (newRule.nextTask && newRule.nextTask !== "") {
    if (dfs(newRule.nextTask)) {
      return {
        hasCycle: true,
        cycle: path,
        message: `Circular dependency detected: ${path.join(' → ')}. This would create an infinite workflow loop.`
      };
    }
  }
  
  return { hasCycle: false };
}

/**
 * Validates that a flow rule doesn't create a cycle
 * Convenience function for use in API endpoints
 */
export async function validateNoCycle(
  existingRules: FlowRule[],
  newRule: { currentTask: string; nextTask: string; status: string }
): Promise<void> {
  const result = detectCycle(existingRules, newRule);
  
  if (result.hasCycle) {
    const error = new Error(result.message || 'Circular dependency detected') as any;
    error.statusCode = 400;
    error.cycle = result.cycle;
    throw error;
  }
}
