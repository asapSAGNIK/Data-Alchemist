// Core data entity interfaces based on the Data Alchemist specification

export interface ClientData {
  ClientID: string | number;
  ClientName: string;
  PriorityLevel: number; // 1-5
  RequestedTaskIDs: string; // comma-separated
  GroupTag: string;
  AttributesJSON: string; // JSON string
  [key: string]: unknown; // Allow additional dynamic fields from CSV
}

export interface WorkerData {
  WorkerID: string | number;
  WorkerName: string;
  Skills: string; // comma-separated
  AvailableSlots: string; // comma-separated phase numbers
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: string | number;
  [key: string]: unknown; // Allow additional dynamic fields from CSV
}

export interface TaskData {
  TaskID: string | number;
  TaskName: string;
  Category: string;
  Duration: number; // number of phases (≥1)
  RequiredSkills: string; // comma-separated
  PreferredPhases: string; // list or range syntax
  MaxConcurrent: number;
  [key: string]: unknown; // Allow additional dynamic fields from CSV
}

// Data with id for DataGrid usage
export interface DataWithId extends Record<string, unknown> {
  id: number;
}

export type ClientDataWithId = ClientData & { id: number };
export type WorkerDataWithId = WorkerData & { id: number };
export type TaskDataWithId = TaskData & { id: number };

// Business rule interfaces
export interface BusinessRule {
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  [key: string]: unknown; // Allow rule-specific properties
}

// Specific rule types for better type safety
export interface CoRunRule extends BusinessRule {
  type: 'coRun';
  tasks: string;
}

export interface SlotRestrictionRule extends BusinessRule {
  type: 'slotRestriction';
  group: string;
  minCommonSlots: number;
}

export interface LoadLimitRule extends BusinessRule {
  type: 'loadLimit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BusinessRule {
  type: 'phaseWindow';
  taskId: string;
  allowedPhases: string;
}

export interface PatternMatchRule extends BusinessRule {
  type: 'patternMatch';
  regex: string;
  template: string;
  parameters: string;
}

export interface PrecedenceOverrideRule extends BusinessRule {
  type: 'precedenceOverride';
  scope: string;
  priority: number;
}

// Union type for all specific rule types
export type TypedBusinessRule = CoRunRule | SlotRestrictionRule | LoadLimitRule | PhaseWindowRule | PatternMatchRule | PrecedenceOverrideRule;

// AI response interfaces
export interface AIQueryResult {
  source: 'clients' | 'workers' | 'tasks';
  result: string;
}

export interface NLQueryResponse {
  results: AIQueryResult[];
}

export interface ValidationIssues {
  clientsErrors?: string[];
  workersErrors?: string[];
  tasksErrors?: string[];
}

export interface AIValidatorResponse {
  inferredValidationIssues: ValidationIssues;
}

export interface AIErrorCorrectionResponse {
  suggestedCorrections: ValidationIssues;
}

export interface RuleRecommendationResponse {
  suggestedRules: TypedBusinessRule[];
}

export interface NLToRuleResponse {
  convertedRules: TypedBusinessRule[];
}

export interface DataModificationResponse {
  modifiedData: {
    clients?: ClientDataWithId[];
    workers?: WorkerDataWithId[];
    tasks?: TaskDataWithId[];
  };
  changes: string[];
}

export interface DataInsightsResponse {
  insights: string;
}

// Generic data row type for CSV/Excel uploads
export type DataRow = Record<string, string | number | boolean | null | undefined>;

// Validation error structure
export interface ValidationErrors {
  [datasetName: string]: string[];
}

// Prioritization settings
export interface PrioritizationSettings {
  [key: string]: number;
}

// Component props interfaces
export interface RuleInputProps {
  onAddRule: (rule: TypedBusinessRule) => void;
}

export interface PrioritizationInputProps {
  onSettingsChange: (settings: PrioritizationSettings) => void;
}

export interface DataInsightsProps {
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

// File upload types
export type FileType = File | null;
export type FileStateSetter = React.Dispatch<React.SetStateAction<FileType>>;
export type DataStateSetter<T> = React.Dispatch<React.SetStateAction<T[]>>;

// API request types
export interface NLQueryRequest {
  query: string;
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

export interface AIValidatorRequest {
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

export interface NLToRuleRequest {
  input: string;
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

export interface RuleRecommendationRequest {
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

export interface ErrorCorrectionRequest {
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
  validationErrors: ValidationErrors;
}

export interface DataModificationRequest {
  instruction: string;
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

export interface DataInsightsRequest {
  clientsData: ClientDataWithId[];
  workersData: WorkerDataWithId[];
  tasksData: TaskDataWithId[];
}

// Export for backward compatibility
export type LegacyAnyData = Record<string, unknown>;
export type LegacyAnyArray = Record<string, unknown>[];
