/**
 * Type definitions for automation tools
 */

export interface AutomationTool {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  processing: string;
  outputs: string[];
  implementation: string;
  imageUrl: string;
}