/**
 * Type definitions for automation tools
 */

export interface BaseAutomationTool {
  id: string;
  name: string;
  description: string;
}

export interface AITool extends BaseAutomationTool {
  capabilities: string[];
  bestPractices: string[];
  limitations: string[];
}

export interface WorkflowTool extends BaseAutomationTool {
  inputs: string[];
  processing: string;
  outputs: string[];
  implementation: string;
  imageUrl: string;
}

export type AutomationTool = AITool | WorkflowTool;

// Type guard to check if a tool is an AI tool
export function isAITool(tool: AutomationTool): tool is AITool {
  return 'capabilities' in tool;
}

// Type guard to check if a tool is a workflow tool
export function isWorkflowTool(tool: AutomationTool): tool is WorkflowTool {
  return 'inputs' in tool;
}