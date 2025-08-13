'use client';

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RuleInput from '@/components/RuleInput';
import PrioritizationInput from '@/components/PrioritizationInput';
import DataInsights from '@/components/DataInsights';
import type {
  DataWithId,
  ValidationErrors,
  PrioritizationSettings,
  TypedBusinessRule,
  AIQueryResult,
  ValidationIssues,
  DataRow,
  ClientDataWithId,
  WorkerDataWithId,
  TaskDataWithId
} from '@/types';

// Helper function to provide suggestions when rule conversion fails
function getSuggestionForFailedRule(input: string): string {
  const lower = input.toLowerCase();
  
  if (lower.includes('together') || lower.includes('same time') || lower.includes('group')) {
    return 'Try: "Tasks T1 and T2 must run together"';
  }
  if (lower.includes('limit') || lower.includes('max') || lower.includes('overload')) {
    return 'Try: "Workers in sales team should have maximum 5 slots per phase"';
  }
  if (lower.includes('phase') || lower.includes('time') || lower.includes('when')) {
    return 'Try: "Task T1 should only run in phases 1, 2, or 3"';
  }
  if (lower.includes('slot') || lower.includes('common')) {
    return 'Try: "Clients in GroupA need at least 3 common slots"';
  }
  
  return 'Try being more specific: "Tasks [ID1] and [ID2] must run together" or "Workers in [group] have max [number] slots"';
}

export default function Home() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [workersFile, setWorkersFile] = useState<File | null>(null);
  const [tasksFile, setTasksFile] = useState<File | null>(null);

  const [clientsData, setClientsData] = useState<DataWithId[]>([]);
  const [workersData, setWorkersData] = useState<DataWithId[]>([]);
  const [tasksData, setTasksData] = useState<DataWithId[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [nlQuery, setNlQuery] = useState<string>('');
  const [nlQueryResults, setNlQueryResults] = useState<AIQueryResult[]>([]);
  const [loadingNlQuery, setLoadingNlQuery] = useState<boolean>(false);
  const [definedRules, setDefinedRules] = useState<TypedBusinessRule[]>([]);
  const [prioritizationSettings, setPrioritizationSettings] = useState<PrioritizationSettings>({});
  const [nlRuleInput, setNlRuleInput] = useState<string>('');
  const [loadingNlRuleConversion, setLoadingNlRuleConversion] = useState<boolean>(false);
  const [suggestedRules, setSuggestedRules] = useState<TypedBusinessRule[]>([]);
  const [loadingRuleRecommendations, setLoadingRuleRecommendations] = useState<boolean>(false);
  const [nlDataModificationInput, setNlDataModificationInput] = useState<string>('');
  const [loadingNlDataModification, setLoadingNlDataModification] = useState<boolean>(false);
  const [suggestedCorrections, setSuggestedCorrections] = useState<ValidationIssues | null>(null);
  const [loadingErrorCorrection, setLoadingErrorCorrection] = useState<boolean>(false);
  const [inferredValidationIssues, setInferredValidationIssues] = useState<ValidationIssues | null>(null);
  const [loadingAiValidator, setLoadingAiValidator] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (event.target.files && event.target.files[0]) {
      setter(event.target.files[0]);
    }
  };

  const parseFile = (file: File, setter: React.Dispatch<React.SetStateAction<DataWithId[]>>) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      if (file.name.endsWith(".csv") && typeof data === 'string') {
        Papa.parse<DataRow>(data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map((row: unknown, index) => ({ id: index, ...(row as DataRow) }));
            setter(parsedData);
            // Trigger full validation after any file is parsed
            triggerFullValidation(file.name, parsedData);
          },
          error: (error: Error) => {
            console.error("CSV parsing error:", error);
            toast.error(`Error parsing CSV file: ${error.message}`);
          }
        });
      } else if (file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        const parsedData = json.map((row: unknown, index) => ({ id: index, ...(row as DataRow) }));
        setter(parsedData);
        // Trigger full validation after any file is parsed
        triggerFullValidation(file.name, parsedData);
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else if (file.name.endsWith(".xlsx")) {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUpload = async () => {
    if (isUploading) {
      toast.warn("Upload already in progress. Please wait...");
      return;
    }

    if (!clientsFile && !workersFile && !tasksFile) {
      toast.warn("Please select at least one file to upload.");
      return;
    }

    setIsUploading(true);
    setValidationErrors({}); // Clear previous validation errors
    
    try {
      // Parse files sequentially to avoid state conflicts
      if (clientsFile) {
        await new Promise<void>((resolve) => {
          parseFile(clientsFile, setClientsData);
          setTimeout(resolve, 100); // Small delay to ensure state updates
        });
      }
      if (workersFile) {
        await new Promise<void>((resolve) => {
          parseFile(workersFile, setWorkersData);
          setTimeout(resolve, 100);
        });
      }
      if (tasksFile) {
        await new Promise<void>((resolve) => {
          parseFile(tasksFile, setTasksData);
          setTimeout(resolve, 100);
        });
      }

      // Trigger validation after all files are processed
      setTimeout(() => {
        triggerFullValidation("batch-upload", []);
        toast.success("All files uploaded and validated successfully!");
      }, 300);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error during file upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddRule = (rule: TypedBusinessRule) => {
    setDefinedRules((prevRules) => [...prevRules, rule]);
    toast.success(`Rule of type '${rule.type}' added!`);
  };

  const handleUpdatePriorities = (priorities: PrioritizationSettings) => {
    setPrioritizationSettings(priorities);
    toast.success('Prioritization settings updated!');
  };

  const handleNlQuery = async () => {
    if (!nlQuery.trim()) {
      toast.warn("Please enter a query.");
      return;
    }

    setLoadingNlQuery(true);
    setNlQueryResults([]);

    try {
      const response = await fetch('/api/nl-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: nlQuery,
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong with the natural language query.');
      }

      const data = await response.json();
      setNlQueryResults(data.results);
      toast.success("Natural language query executed successfully!");
    } catch (error: unknown) {
      console.error("NL Query Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`NL Query Error: ${message}`);
    } finally {
      setLoadingNlQuery(false);
    }
  };

  const handleNlRuleConversion = async () => {
    if (!nlRuleInput.trim()) {
      toast.warn("Please enter a natural language rule description.");
      return;
    }

    setLoadingNlRuleConversion(true);

    try {
      const response = await fetch('/api/nl-to-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguageRule: nlRuleInput,
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Something went wrong with natural language to rule conversion.';
        
        // Check for specific Google API errors
        if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
          throw new Error('🔄 Google AI service is temporarily overloaded. Please try again in a few minutes.');
        }
        
        // Check for JSON parsing errors with helpful message
        if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
          throw new Error('🤖 AI response was unclear. Try being more specific with your rule description (e.g., "Tasks T1 and T2 must run together").');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("[DEBUG] Rule conversion response:", data);
      const convertedRule = data.rule;

      if (convertedRule && Object.keys(convertedRule).length > 0) {
        handleAddRule(convertedRule); // Add the converted rule
        setNlRuleInput(''); // Clear input
        toast.success("✅ Natural language rule converted and added successfully!");
      } else {
        // Provide helpful suggestions for common rule types
        const suggestion = getSuggestionForFailedRule(nlRuleInput);
        toast.warn(`❓ Could not convert to a valid rule. ${suggestion}`);
      }
    } catch (error: unknown) {
      console.error("NL Rule Conversion Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`NL Rule Conversion Error: ${message}`);
    } finally {
      setLoadingNlRuleConversion(false);
    }
  };

  const handleGenerateRuleRecommendations = async () => {
    setLoadingRuleRecommendations(true);
    setSuggestedRules([]);

    try {
      const response = await fetch('/api/rule-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Something went wrong with rule recommendations.');
      }

      const data = await response.json();
      console.log("[DEBUG] Rule recommendations response:", data);
      
      // data.rules is already parsed by the API - no need for JSON.parse()
      const rules = data.rules;
      if (Array.isArray(rules)) {
        setSuggestedRules(rules);
        toast.success(`✅ ${rules.length} rule recommendations generated successfully!`);
      } else {
        console.error("Invalid rules format:", rules);
        toast.warn("AI did not return a valid array of rules. Please try again.");
      }
    } catch (error: unknown) {
      console.error("Rule Recommendation Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Rule Recommendation Error: ${message}`);
    } finally {
      setLoadingRuleRecommendations(false);
    }
  };

  const handleAddSuggestedRule = (rule: TypedBusinessRule) => {
    handleAddRule(rule);
    setSuggestedRules((prev) => prev.filter((r) => r !== rule));
  };

  const handleNlDataModification = async () => {
    if (!nlDataModificationInput.trim()) {
      toast.warn("Please enter a natural language data modification request.");
      return;
    }

    setLoadingNlDataModification(true);

    try {
      const response = await fetch('/api/nl-data-modification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguageModification: nlDataModificationInput,
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[DEBUG] Data modification API error:", errorData);
        
        // Provide more specific error messages
        let userFriendlyMessage = errorData.error || 'Something went wrong with natural language data modification.';
        if (errorData.suggestion) {
          userFriendlyMessage += ` Suggestion: ${errorData.suggestion}`;
        }
        
        throw new Error(userFriendlyMessage);
      }

      const data = await response.json();
      console.log("[DEBUG] Data modification response:", data);
      
      const modifiedData = data.modifiedData;
      console.log("[DEBUG] Modified data:", modifiedData);
      console.log("[DEBUG] Modified data type:", typeof modifiedData);
      console.log("[DEBUG] Is array:", Array.isArray(modifiedData));

      if (modifiedData && (typeof modifiedData === 'object' || Array.isArray(modifiedData))) {
        let changesApplied = false;
        
        // Type safely handle modification data
        const safeModifiedData = modifiedData as {
          clientsData?: DataRow[];
          workersData?: DataRow[];
          tasksData?: DataRow[];
        };
        
        if (safeModifiedData.clientsData && Array.isArray(safeModifiedData.clientsData)) {
          console.log("[DEBUG] Updating clients data with:", safeModifiedData.clientsData);
          setClientsData(safeModifiedData.clientsData.map((row: DataRow, index: number) => ({ id: index, ...row })));
          changesApplied = true;
        }
        if (safeModifiedData.workersData && Array.isArray(safeModifiedData.workersData)) {
          console.log("[DEBUG] Updating workers data with:", safeModifiedData.workersData);
          setWorkersData(safeModifiedData.workersData.map((row: DataRow, index: number) => ({ id: index, ...row })));
          changesApplied = true;
        }
        if (safeModifiedData.tasksData && Array.isArray(safeModifiedData.tasksData)) {
          console.log("[DEBUG] Updating tasks data with:", safeModifiedData.tasksData);
          setTasksData(safeModifiedData.tasksData.map((row: DataRow, index: number) => ({ id: index, ...row })));
          changesApplied = true;
        }
        
        // If the response is a single array (legacy format)
        if (Array.isArray(modifiedData)) {
          console.log("[DEBUG] Received array format, determining target dataset");
          const arrayData = modifiedData as DataRow[];
          if (clientsData.length > 0) {
            setClientsData(arrayData.map((row: DataRow, index: number) => ({ id: index, ...row })));
            changesApplied = true;
          } else if (workersData.length > 0) {
            setWorkersData(arrayData.map((row: DataRow, index: number) => ({ id: index, ...row })));
            changesApplied = true;
          } else if (tasksData.length > 0) {
            setTasksData(arrayData.map((row: DataRow, index: number) => ({ id: index, ...row })));
            changesApplied = true;
          }
        }

        if (changesApplied) {
          triggerFullValidation("data-modification-trigger", []); // Re-validate all data after modification
          setNlDataModificationInput(''); // Clear input
          toast.success("✅ Data modified successfully using natural language!");
        } else {
          console.warn("[DEBUG] No changes were applied - modifiedData structure:", modifiedData);
          toast.warn("AI response received but no data changes were applied. The modification might not have matched any data.");
        }
      } else {
        console.warn("[DEBUG] Invalid or empty modified data:", modifiedData);
        toast.warn("AI could not perform the requested data modification. Please refine your request and be more specific.");
      }
    } catch (error: unknown) {
      console.error("NL Data Modification Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`NL Data Modification Error: ${message}`);
    } finally {
      setLoadingNlDataModification(false);
    }
  };

  const handleSuggestErrorCorrection = async () => {
    setLoadingErrorCorrection(true);
    setSuggestedCorrections(null);

    if (Object.keys(validationErrors).length === 0) {
      toast.info("No validation errors to correct.");
      setLoadingErrorCorrection(false);
      return;
    }

    try {
      const response = await fetch('/api/ai-error-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validationErrors: validationErrors,
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Something went wrong with AI error correction.';
        
        // Check for specific error types with helpful messages
        if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
          throw new Error('🤖 AI response was unclear. The errors may be too complex to auto-correct. Try fixing them manually or simplifying the data.');
        }
        if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
          throw new Error('🔄 Google AI service is temporarily overloaded. Please try again in a few minutes.');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const corrections = data.suggestedCorrections;

      if (corrections && (corrections.clientsData || corrections.workersData || corrections.tasksData)) {
        console.log("AI suggested corrections:", corrections); // Add this line
        setSuggestedCorrections(corrections);
        toast.success("AI suggested corrections. Review and apply them.");
      } else {
        toast.warn("AI could not suggest corrections for the current errors.");
      }
    } catch (error: unknown) {
      console.error("AI Error Correction API Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`AI Error Correction Error: ${message}`);
    } finally {
      setLoadingErrorCorrection(false);
    }
  };

  const handleApplySuggestedCorrections = () => {
    if (!suggestedCorrections) return;

    let updatedClientsData = clientsData;
    let updatedWorkersData = workersData;
    let updatedTasksData = tasksData;

    // Handle corrected data if available (temporary cast for backward compatibility)
    const corrections = suggestedCorrections as ValidationIssues & {
      clientsData?: DataRow[];
      workersData?: DataRow[];
      tasksData?: DataRow[];
    };
    
    if (corrections.clientsData) {
      updatedClientsData = corrections.clientsData.map((row: DataRow, index: number) => ({ id: index, ...row }));
      setClientsData(updatedClientsData);
    }
    if (corrections.workersData) {
      updatedWorkersData = corrections.workersData.map((row: DataRow, index: number) => ({ id: index, ...row }));
      setWorkersData(updatedWorkersData);
    }
    if (corrections.tasksData) {
      updatedTasksData = corrections.tasksData.map((row: DataRow, index: number) => ({ id: index, ...row }));
      setTasksData(updatedTasksData);
    }

    setSuggestedCorrections(null); // Clear suggestions after applying
    triggerFullValidation("applied-corrections", updatedClientsData, updatedWorkersData, updatedTasksData); 
    toast.success("Suggested corrections applied successfully!");
  };

  const handleAiValidation = async () => {
    setLoadingAiValidator(true);
    setInferredValidationIssues(null);

    try {
      const response = await fetch('/api/ai-validator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientsData: clientsData,
          workersData: workersData,
          tasksData: tasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong with AI validation.');
      }

      const data = await response.json();
      const issues = data.inferredValidationIssues;

      if (issues && (issues.clientsErrors || issues.workersErrors || issues.tasksErrors)) {
        setInferredValidationIssues(issues);
        toast.info("AI inferred potential validation issues. Review them.");
      } else {
        toast.info("AI found no additional validation issues based on inferred patterns.");
      }
    } catch (error: unknown) {
      console.error("AI Validator API Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`AI Validator Error: ${message}`);
    } finally {
      setLoadingAiValidator(false);
    }
  };

  const handleGenerateRulesConfig = () => {
    const rulesConfig = JSON.stringify(definedRules, null, 2);
    const blob = new Blob([rulesConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Rules config generated successfully!');
  };

  const triggerFullValidation = (
    fileName: string, 
    currentData: DataWithId[], // This parameter is used for single file parsing
    clientsDataOverride?: DataWithId[], // New: Optional override for clients data
    workersDataOverride?: DataWithId[], // New: Optional override for workers data
    tasksDataOverride?: DataWithId[]    // New: Optional override for tasks data
  ) => {
    // Update the state based on the file that was just parsed (original logic)
    if (fileName.includes("clients")) {
      setClientsData(currentData);
    }
    else if (fileName.includes("workers")) {
      setWorkersData(currentData);
    }
    else if (fileName.includes("tasks")) {
      setTasksData(currentData);
    }

    // Validate all data after state updates. Use a timeout to ensure state is updated.
    setTimeout(() => {
      // Use overrides if provided, otherwise use current state
      const allClientsData = clientsDataOverride || clientsData;
      const allWorkersData = workersDataOverride || workersData;
      const allTasksData = tasksDataOverride || tasksData;

      const allErrors: { [key: string]: string[] } = {};
      // Basic validations
      const clientErrors = validateSingleDataset(allClientsData, "clients");
      const workerErrors = validateSingleDataset(allWorkersData, "workers");
      const taskErrors = validateSingleDataset(allTasksData, "tasks");

      if (clientErrors.length > 0) allErrors["clients"] = clientErrors;
      if (workerErrors.length > 0) allErrors["workers"] = workerErrors;
      if (taskErrors.length > 0) allErrors["tasks"] = taskErrors;

      // Cross-data validations
      if (allClientsData.length > 0 && allTasksData.length > 0) {
        const clientTaskErrors = validateClientTaskRelationship(allClientsData, allTasksData);
        if (clientTaskErrors.length > 0) allErrors["clients"] = [...(allErrors["clients"] || []), ...clientTaskErrors];
      }

      if (allTasksData.length > 0 && allWorkersData.length > 0) {
        const taskWorkerErrors = validateTaskWorkerRelationship(allTasksData, allWorkersData);
        if (taskWorkerErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...taskWorkerErrors];
      }

      // Add complex validations
      const overloadedWorkerErrors = validateOverloadedWorkers(allWorkersData);
      if (overloadedWorkerErrors.length > 0) allErrors["workers"] = [...(allErrors["workers"] || []), ...overloadedWorkerErrors];

      const phaseSaturationErrors = validatePhaseSlotSaturation(allTasksData, allWorkersData);
      if (phaseSaturationErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...phaseSaturationErrors];

      const maxConcurrencyErrors = validateMaxConcurrencyFeasibility(allTasksData, allWorkersData);
      if (maxConcurrencyErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...maxConcurrencyErrors];

      // Placeholders for Milestone 2 validations
      const circularCoRunErrors = validateCircularCoRunGroups(tasksData);
      if (circularCoRunErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...circularCoRunErrors];

      const conflictingRulesErrors = validateConflictingRules(tasksData);
      if (conflictingRulesErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...conflictingRulesErrors];

      setValidationErrors(allErrors);

      if (Object.keys(allErrors).some(key => allErrors[key].length > 0)) {
        toast.error("Validation errors found. Please check the summary.");
      } else if (allClientsData.length > 0 || allWorkersData.length > 0 || allTasksData.length > 0) {
        toast.success("All data validated successfully!");
      }
    }, 0);
  };

  const validateSingleDataset = (data: DataWithId[], type: 'clients' | 'workers' | 'tasks') => {
    const errors: string[] = [];

    // 1. Missing required column(s).
    let requiredColumns: string[] = [];
    if (type === 'clients') requiredColumns = ["ClientID", "ClientName", "PriorityLevel", "RequestedTaskIDs", "GroupTag", "AttributesJSON"];
    else if (type === 'workers') requiredColumns = ["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase", "WorkerGroup", "QualificationLevel"];
    else if (type === 'tasks') requiredColumns = ["TaskID", "TaskName", "Category", "Duration", "RequiredSkills", "PreferredPhases", "MaxConcurrent"];

    if (data.length > 0) {
      const actualColumns = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns for ${type}: ${missingColumns.join(", ")}`);
      }
    }

    // 2. Duplicate IDs (ClientID/WorkerID/TaskID).
    const idField = type === 'clients' ? 'ClientID' : type === 'workers' ? 'WorkerID' : 'TaskID';
    const ids = data.map(row => row[idField]);
    const duplicateIds = ids.filter((id, index) => id !== undefined && ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate IDs found for ${type}: ${[...new Set(duplicateIds)].join(", ")}`);
    }

    // Specific validations based on data type
    data.forEach((row, rowIndex) => {
      // Clients Validations
      if (type === 'clients') {
        // 4. Out-of-range values (PriorityLevel not 1–5)
        const priority = parseInt(String(row.PriorityLevel || ''));
        if (isNaN(priority) || priority < 1 || priority > 5) {
          errors.push(`Row ${rowIndex + 1} (ClientID: ${row.ClientID || 'N/A'}): Invalid PriorityLevel. Must be between 1 and 5.`);
        }
        // 5. Broken JSON in AttributesJSON.
        try {
          const attrsJson = row.AttributesJSON;
          if (attrsJson && typeof attrsJson === 'string' && attrsJson.trim() !== "") {
            JSON.parse(attrsJson);
          }
        } catch {
          errors.push(`Row ${rowIndex + 1} (ClientID: ${row.ClientID || 'N/A'}): Malformed AttributesJSON.`);
        }
      }

      // Workers Validations
      if (type === 'workers') {
        // 3. Malformed lists (non-numeric in AvailableSlots etc)
        if (row.AvailableSlots) {
          const slots = String(row.AvailableSlots).split(',').map(Number);
          if (slots.some(isNaN) || !String(row.AvailableSlots).split(',').every(s => /^[0-9]+$/.test(s.trim()))) {
            errors.push(`Row ${rowIndex + 1} (WorkerID: ${row.WorkerID || 'N/A'}): Malformed AvailableSlots. Must be comma-separated numbers.`);
          }
        }
        // 4. Out-of-range values (MaxLoadPerPhase)
        const maxLoad = parseInt(String(row.MaxLoadPerPhase || ''));
        if (isNaN(maxLoad) || maxLoad < 0) {
          errors.push(`Row ${rowIndex + 1} (WorkerID: ${row.WorkerID || 'N/A'}): Invalid MaxLoadPerPhase. Must be a non-negative number.`);
        }
      }

      // Tasks Validations
      if (type === 'tasks') {
        // 4. Out-of-range values (Duration < 1)
        const duration = parseInt(String(row.Duration || ''));
        if (isNaN(duration) || duration < 1) {
          errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Invalid Duration. Must be 1 or greater.`);
        }
        // 4. Out-of-range values (MaxConcurrent)
        const maxConcurrent = parseInt(String(row.MaxConcurrent || ''));
        if (isNaN(maxConcurrent) || maxConcurrent < 1) {
          errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Invalid MaxConcurrent. Must be 1 or greater.`);
        }
        // PreferredPhases parsing and normalization
        if (row.PreferredPhases) {
          let normalizedPhases: number[] = [];
          const phasesString = String(row.PreferredPhases).trim();
          if (phasesString.startsWith("[") && phasesString.endsWith("]")) {
            // Handle array format like [1,3,5]
            try {
              const parsedArray = JSON.parse(phasesString);
              if (Array.isArray(parsedArray) && parsedArray.every(p => typeof p === 'number')) {
                normalizedPhases = parsedArray;
              } else {
                errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Malformed PreferredPhases array.`);
              }
            } catch {
              errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Malformed PreferredPhases JSON array.`);
            }
          } else if (/^\\d+-\\d+$/.test(phasesString)) {
            // Handle range format like 1-3
            const [start, end] = phasesString.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              for (let i = start; i <= end; i++) {
                normalizedPhases.push(i);
              }
            } else {
              errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Malformed PreferredPhases range. Use "start-end" format where start <= end.`);
            }
          } else if (/^\\d+(?:,\\d+)*$/.test(phasesString)) {
            // Handle comma-separated numbers like 2,4,5
            normalizedPhases = phasesString.split(',').map(Number);
            if (normalizedPhases.some(isNaN)) {
              errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Malformed PreferredPhases. Use "1-3" or "2,4,5" format.`);
            }
          } else {
            errors.push(`Row ${rowIndex + 1} (TaskID: ${row.TaskID || 'N/A'}): Malformed PreferredPhases. Use "1-3" or "2,4,5" format.`);
          }
          // Store normalized phases back, maybe in a new field or replace. For now, just validate.
          // row.NormalizedPreferredPhases = normalizedPhases; // Example of storing normalized data
        }
      }
    });
    return errors;
  };

  const validateClientTaskRelationship = (clients: DataWithId[], tasks: DataWithId[]) => {
    const errors: string[] = [];
    const taskIds = new Set(tasks.map(task => String(task.TaskID)));

    clients.forEach((client, rowIndex) => {
      if (client.RequestedTaskIDs) {
        const requestedIds = String(client.RequestedTaskIDs).split(',').map(id => id.trim());
        requestedIds.forEach(reqId => {
          if (reqId && !taskIds.has(reqId)) {
            errors.push(`Row ${rowIndex + 1} (ClientID: ${client.ClientID || 'N/A'}): Requested Task ID '${reqId}' not found in tasks data.`);
          }
        });
      }
    });
    return errors;
  };

  const validateTaskWorkerRelationship = (tasks: DataWithId[], workers: DataWithId[]) => {
    const errors: string[] = [];
    const workerSkills = new Set(workers.flatMap(worker => String(worker.Skills || '').split(',').map(s => s.trim()).filter(s => s)));

    tasks.forEach((task, rowIndex) => {
      if (task.RequiredSkills) {
        const requiredSkills = String(task.RequiredSkills).split(',').map(skill => skill.trim());
        requiredSkills.forEach(reqSkill => {
          if (reqSkill && !workerSkills.has(reqSkill)) {
            errors.push(`Row ${rowIndex + 1} (TaskID: ${task.TaskID || 'N/A'}): Required skill '${reqSkill}' not found in any worker's skills.`);
          }
        });
      }
    });
    return errors;
  };

  // New: Overloaded workers validation
  const validateOverloadedWorkers = (workers: DataWithId[]) => {
    const errors: string[] = [];
    workers.forEach((worker, rowIndex) => {
      if (worker.AvailableSlots && worker.MaxLoadPerPhase !== undefined) {
        const availableSlots = String(worker.AvailableSlots).split(',').map(Number).filter(n => !isNaN(n));
        const maxLoadPerPhase = parseInt(String(worker.MaxLoadPerPhase || ''));
        if (!isNaN(maxLoadPerPhase) && availableSlots.length < maxLoadPerPhase) {
          errors.push(`Row ${rowIndex + 1} (WorkerID: ${worker.WorkerID || 'N/A'}): Worker is overloaded. Available slots (${availableSlots.length}) are less than MaxLoadPerPhase (${maxLoadPerPhase}).`);
        }
      }
    });
    return errors;
  };

  // New: Phase-slot saturation validation
  const validatePhaseSlotSaturation = (tasks: DataWithId[], workers: DataWithId[]) => {
    const errors: string[] = [];
    const phaseCapacities: { [phase: number]: number } = {};
    const taskDurations: { [taskId: string]: number } = {};

    workers.forEach(worker => {
      const availableSlots = String(worker.AvailableSlots || '').split(',').map(Number).filter(n => !isNaN(n));
      availableSlots.forEach(phase => {
        phaseCapacities[phase] = (phaseCapacities[phase] || 0) + (parseInt(String(worker.MaxLoadPerPhase || '')) || 0);
      });
    });

    tasks.forEach(task => {
      taskDurations[String(task.TaskID)] = parseInt(String(task.Duration || '')) || 0;
    });

    // This is a simplified check. A full check would involve actual task assignments.
    // For now, we'll check if sum of all task durations for tasks that *could* be in a phase
    // exceeds the total worker capacity for that phase.
    // This needs a more sophisticated approach, but for a basic check:
    // Iterate through phases, sum up task durations that can occur in that phase,
    // and compare with total worker slots for that phase.

    const allPhases = new Set<number>();
    tasks.forEach(task => {
      const preferredPhases = parsePreferredPhases(String(task.PreferredPhases || ''));
      preferredPhases.forEach(phase => allPhases.add(phase));
    });

    Array.from(allPhases).sort((a, b) => a - b).forEach(phase => {
      let totalTaskDurationInPhase = 0;
      tasks.forEach(task => {
        const preferredPhases = parsePreferredPhases(String(task.PreferredPhases || ''));
        if (preferredPhases.includes(phase)) {
          totalTaskDurationInPhase += (parseInt(String(task.Duration || '')) || 0);
        }
      });

      const availableCapacity = phaseCapacities[phase] || 0;
      if (totalTaskDurationInPhase > availableCapacity) {
        errors.push(`Phase ${phase}: Total task duration (${totalTaskDurationInPhase}) exceeds available worker capacity (${availableCapacity}).`);
      }
    });

    return errors;
  };

  // Helper function to parse PreferredPhases (copied from validateSingleDataset for re-use)
  const parsePreferredPhases = (phasesString: string): number[] => {
    let normalizedPhases: number[] = [];
    if (phasesString.startsWith("[") && phasesString.endsWith("]")) {
      try {
        const parsedArray = JSON.parse(phasesString);
        if (Array.isArray(parsedArray) && parsedArray.every(p => typeof p === 'number')) {
          normalizedPhases = parsedArray;
        }
      } catch { /* silent fail, error handled in validateSingleDataset */ }
    } else if (/^\\d+-\\d+$/.test(phasesString)) {
      const [start, end] = phasesString.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          normalizedPhases.push(i);
        }
      }
    } else if (/^\\d+(?:,\\d+)*$/.test(phasesString)) {
      normalizedPhases = phasesString.split(',').map(Number);
      if (normalizedPhases.some(isNaN)) { /* silent fail */ }
    }
    return normalizedPhases;
  };

  // New: Max-concurrency feasibility validation
  const validateMaxConcurrencyFeasibility = (tasks: DataWithId[], workers: DataWithId[]) => {
    const errors: string[] = [];
    // This is a simplified check. A full check would involve actual task assignments.
    // For now, we'll check if MaxConcurrent <= count of qualified workers for that skill.
    const skillToWorkerCount: { [skill: string]: number } = {};
    workers.forEach(worker => {
      const skills = String(worker.Skills || '').split(',').map(s => s.trim()).filter(s => s);
      skills.forEach(skill => {
        skillToWorkerCount[skill] = (skillToWorkerCount[skill] || 0) + 1;
      });
    });

    tasks.forEach((task, rowIndex) => {
      if (task.RequiredSkills && task.MaxConcurrent !== undefined) {
        const requiredSkills = String(task.RequiredSkills).split(',').map(skill => skill.trim());
        const maxConcurrent = parseInt(String(task.MaxConcurrent || ''));

        if (!isNaN(maxConcurrent) && maxConcurrent > 0) {
          let canMeetConcurrency = true;
          requiredSkills.forEach(skill => {
            if (skillToWorkerCount[skill] === undefined || skillToWorkerCount[skill] < maxConcurrent) {
              canMeetConcurrency = false;
            }
          });
          if (!canMeetConcurrency) {
            errors.push(`Row ${rowIndex + 1} (TaskID: ${task.TaskID || 'N/A'}): MaxConcurrent (${maxConcurrent}) might not be feasible for all required skills. Not enough qualified workers.`);
          }
        }
      }
    });
    return errors;
  };

  // Placeholder for Circular co-run groups - requires rule parsing from Milestone 2
  const validateCircularCoRunGroups = (_tasks: DataWithId[]) => {
    const errors: string[] = [];
    // This validation requires the rules structure from Milestone 2 (Co-run rules).
    // For now, it's a placeholder.
    return errors;
  };

  // Placeholder for Conflicting rules vs. phase-window constraints - requires rule parsing from Milestone 2
  const validateConflictingRules = (_tasks: DataWithId[]) => {
    const errors: string[] = [];
    // This validation requires the rules structure from Milestone 2.
    // For now, it's a placeholder.
    return errors;
  };

  const generateColumns = (data: DataWithId[], type: 'clients' | 'workers' | 'tasks'): GridColDef[] => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    const errorsForType = validationErrors[type] || [];

    return keys.map((key): GridColDef => ({
      field: key,
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
      flex: 1,
      editable: key !== 'id', // Allow editing for all columns except 'id'
      cellClassName: (params) => {
        // Check if this cell has an error
        const rowId = params.id as number;
        // A very basic check: see if any error message includes this cell's value or related row ID
        const hasError = errorsForType.some(errorMsg =>
          errorMsg.includes(`Row ${rowId + 1}`) || errorMsg.includes(`(ClientID: ${(params.row as DataWithId).ClientID})`) ||
          errorMsg.includes(`(WorkerID: ${(params.row as DataWithId).WorkerID})`) || errorMsg.includes(`(TaskID: ${(params.row as DataWithId).TaskID})`)
        );
        return hasError ? 'error-cell' : '';
      },
    }));
  };

  const processRowUpdate = (newRow: DataWithId, oldRow: DataWithId, setter: React.Dispatch<React.SetStateAction<DataWithId[]>>, type: 'clients' | 'workers' | 'tasks') => {
    // Update the state
    setter((prev: DataWithId[]) => {
      return prev.map((row) => (row.id === newRow.id ? newRow : row));
    });

    // Trigger full validation after the state is updated
    setTimeout(() => {
      // Use current state data for validation
      const allClientsData = type === 'clients' ? 
        (type === 'clients' ? clientsData.map((row) => (row.id === newRow.id ? newRow : row)) : clientsData) : 
        clientsData;
      const allWorkersData = type === 'workers' ? 
        (type === 'workers' ? workersData.map((row) => (row.id === newRow.id ? newRow : row)) : workersData) : 
        workersData;
      const allTasksData = type === 'tasks' ? 
        (type === 'tasks' ? tasksData.map((row) => (row.id === newRow.id ? newRow : row)) : tasksData) : 
        tasksData;

      const allErrors: { [key: string]: string[] } = {};
      const clientErrors = validateSingleDataset(allClientsData, "clients");
      const workerErrors = validateSingleDataset(allWorkersData, "workers");
      const taskErrors = validateSingleDataset(allTasksData, "tasks");

      if (clientErrors.length > 0) allErrors["clients"] = clientErrors;
      if (workerErrors.length > 0) allErrors["workers"] = workerErrors;
      if (taskErrors.length > 0) allErrors["tasks"] = taskErrors;

      if (allClientsData.length > 0 && allTasksData.length > 0) {
        const clientTaskErrors = validateClientTaskRelationship(allClientsData, allTasksData);
        if (clientTaskErrors.length > 0) allErrors["clients"] = [...(allErrors["clients"] || []), ...clientTaskErrors];
      }

      if (allTasksData.length > 0 && allWorkersData.length > 0) {
        const taskWorkerErrors = validateTaskWorkerRelationship(allTasksData, allWorkersData);
        if (taskWorkerErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...taskWorkerErrors];
      }

      // Add complex validations
      const overloadedWorkerErrors = validateOverloadedWorkers(allWorkersData);
      if (overloadedWorkerErrors.length > 0) allErrors["workers"] = [...(allErrors["workers"] || []), ...overloadedWorkerErrors];

      const phaseSaturationErrors = validatePhaseSlotSaturation(allTasksData, allWorkersData);
      if (phaseSaturationErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...phaseSaturationErrors];

      const maxConcurrencyErrors = validateMaxConcurrencyFeasibility(allTasksData, allWorkersData);
      if (maxConcurrencyErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...maxConcurrencyErrors];

      // Placeholders for Milestone 2 validations
      const circularCoRunErrors = validateCircularCoRunGroups(tasksData);
      if (circularCoRunErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...circularCoRunErrors];

      const conflictingRulesErrors = validateConflictingRules(tasksData);
      if (conflictingRulesErrors.length > 0) allErrors["tasks"] = [...(allErrors["tasks"] || []), ...conflictingRulesErrors];

      console.log("[DEBUG] Validation results:", allErrors);
      setValidationErrors(allErrors);

      if (Object.keys(allErrors).some(key => allErrors[key].length > 0)) {
        toast.error("Validation errors found. Please check the summary.");
      } else if (allClientsData.length > 0 || allWorkersData.length > 0 || allTasksData.length > 0) {
        toast.success("All data validated successfully!");
      }
    }, 0);

    return newRow;
  };

  const handleProcessRowUpdateError = (error: unknown) => {
    console.error("Row update error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Error updating row: ${message}`);
  };

  const handleExportAllData = () => {
    const dataToExport = {
      clients: clientsData,
      workers: workersData,
      tasks: tasksData,
      rules: definedRules,
      prioritizationSettings: prioritizationSettings,
    };

    const csvContent = Papa.unparse(Object.values(dataToExport).flat());
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_alchemist_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('All data exported successfully!');
  };

  return (
    <div className="font-sans min-h-screen bg-black text-white p-4">
      <ToastContainer />
      <main className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Data Alchemist</h1>
        
        {/* File Upload Section - Top Center */}
        <Box sx={{
          mb: 4,
          mx: 'auto',
          maxWidth: '600px',
          p: 2,
          border: '1px solid #555',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}>
          <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '15px', textAlign: 'center' }}>Upload Data Files</Typography>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label htmlFor="clients-file" style={{ color: 'white', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Clients:</label>
            <input
              id="clients-file"
              type="file"
              accept=".csv, .xlsx"
              onChange={(e) => handleFileChange(e, setClientsFile)}
                style={{ backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '8px', borderRadius: '5px', width: '100%', fontSize: '0.85rem' }}
            />
          </div>
            <div>
              <label htmlFor="workers-file" style={{ color: 'white', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Workers:</label>
            <input
              id="workers-file"
              type="file"
              accept=".csv, .xlsx"
              onChange={(e) => handleFileChange(e, setWorkersFile)}
                style={{ backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '8px', borderRadius: '5px', width: '100%', fontSize: '0.85rem' }}
            />
          </div>
            <div>
              <label htmlFor="tasks-file" style={{ color: 'white', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Tasks:</label>
            <input
              id="tasks-file"
              type="file"
              accept=".csv, .xlsx"
              onChange={(e) => handleFileChange(e, setTasksFile)}
                style={{ backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '8px', borderRadius: '5px', width: '100%', fontSize: '0.85rem' }}
            />
          </div>
          </div>
          <div className="text-center">
          <button
            onClick={handleUpload}
            disabled={isUploading}
              className={`rounded-lg border border-solid border-transparent transition-colors flex items-center justify-center gap-2 font-medium text-sm h-9 px-4 mx-auto ${
              isUploading 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              'Upload Files'
            )}
          </button>
        </div>
        </Box>

        {/* Data Grids Section - Show immediately after upload */}
        {(clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0) && (
          <div className="mb-6">
            <Typography variant="h5" component="h2" style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>📊 Data Overview</Typography>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {clientsData.length > 0 && (
                <Box sx={{
                  height: 350,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '& .MuiDataGrid-root': { border: 'none' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#2a2a2a', color: 'white', fontSize: '0.85rem', borderBottom: '1px solid #555' },
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                  '& .MuiDataGrid-cell': { color: '#eee', borderBottom: '1px solid #333', fontSize: '0.8rem' },
                  '& .MuiDataGrid-row': { '&:hover': { backgroundColor: '#2a2a2a' }, '&.Mui-selected': { backgroundColor: '#3a3a3a', '&:hover': { backgroundColor: '#4a4a4a' } } },
                  '& .MuiDataGrid-footerContainer': { backgroundColor: '#2a2a2a', color: 'white', borderTop: '1px solid #555' },
                  '& .MuiTablePagination-root': { color: 'white' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                  '& .MuiDataGrid-checkboxInput': { color: '#4CAF50' },
                }}>
                  <Typography variant="h6" component="h3" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>Clients ({clientsData.length})</Typography>
                  <DataGrid
                    rows={clientsData}
                    columns={generateColumns(clientsData, "clients")}
                    pageSizeOptions={[5, 10, 20, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    checkboxSelection
                    disableRowSelectionOnClick
                    processRowUpdate={(newRow, oldRow) => processRowUpdate(newRow, oldRow, setClientsData, "clients")}
                    onProcessRowUpdateError={handleProcessRowUpdateError}
                    editMode="row"
                  />
                </Box>
              )}

              {workersData.length > 0 && (
                <Box sx={{
                  height: 350,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '& .MuiDataGrid-root': { border: 'none' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#2a2a2a', color: 'white', fontSize: '0.85rem', borderBottom: '1px solid #555' },
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                  '& .MuiDataGrid-cell': { color: '#eee', borderBottom: '1px solid #333', fontSize: '0.8rem' },
                  '& .MuiDataGrid-row': { '&:hover': { backgroundColor: '#2a2a2a' }, '&.Mui-selected': { backgroundColor: '#3a3a3a', '&:hover': { backgroundColor: '#4a4a4a' } } },
                  '& .MuiDataGrid-footerContainer': { backgroundColor: '#2a2a2a', color: 'white', borderTop: '1px solid #555' },
                  '& .MuiTablePagination-root': { color: 'white' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                  '& .MuiDataGrid-checkboxInput': { color: '#4CAF50' },
                }}>
                  <Typography variant="h6" component="h3" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>Workers ({workersData.length})</Typography>
                  <DataGrid
                    rows={workersData}
                    columns={generateColumns(workersData, "workers")}
                    pageSizeOptions={[5, 10, 20, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    checkboxSelection
                    disableRowSelectionOnClick
                    processRowUpdate={(newRow, oldRow) => processRowUpdate(newRow, oldRow, setWorkersData, "workers")}
                    onProcessRowUpdateError={handleProcessRowUpdateError}
                    editMode="row"
                  />
                </Box>
              )}

              {tasksData.length > 0 && (
                <Box sx={{
                  height: 350,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '& .MuiDataGrid-root': { border: 'none' },
                  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#2a2a2a', color: 'white', fontSize: '0.85rem', borderBottom: '1px solid #555' },
                  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                  '& .MuiDataGrid-cell': { color: '#eee', borderBottom: '1px solid #333', fontSize: '0.8rem' },
                  '& .MuiDataGrid-row': { '&:hover': { backgroundColor: '#2a2a2a' }, '&.Mui-selected': { backgroundColor: '#3a3a3a', '&:hover': { backgroundColor: '#4a4a4a' } } },
                  '& .MuiDataGrid-footerContainer': { backgroundColor: '#2a2a2a', color: 'white', borderTop: '1px solid #555' },
                  '& .MuiTablePagination-root': { color: 'white' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                  '& .MuiDataGrid-checkboxInput': { color: '#4CAF50' },
                }}>
                  <Typography variant="h6" component="h3" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>Tasks ({tasksData.length})</Typography>
                  <DataGrid
                    rows={tasksData}
                    columns={generateColumns(tasksData, "tasks")}
                    pageSizeOptions={[5, 10, 20, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    checkboxSelection
                    disableRowSelectionOnClick
                    processRowUpdate={(newRow, oldRow) => processRowUpdate(newRow, oldRow, setTasksData, "tasks")}
                    onProcessRowUpdateError={handleProcessRowUpdateError}
                    editMode="row"
                  />
                </Box>
              )}
            </div>
          </div>
        )}

        {/* Operational Buttons Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {/* Natural Language Query */}
          <Box sx={{
            p: 2,
            border: '1px solid #555',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>🔍 Natural Language Query</Typography>
          <TextField
            fullWidth
              size="small"
              label="Ask about your data"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNlQuery();
              }
            }}
            sx={{
                mb: 1,
                '& .MuiInputBase-input': { color: 'white', fontSize: '0.85rem' },
                '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            }}
          />
          <Button
            variant="contained"
              size="small"
            onClick={handleNlQuery}
            disabled={loadingNlQuery || (!clientsData.length && !workersData.length && !tasksData.length)}
              startIcon={loadingNlQuery && <CircularProgress size={16} color="inherit" />}
              sx={{ backgroundColor: '#4CAF50', color: 'white', '&:hover': { backgroundColor: '#45a049' }, fontSize: '0.8rem' }}
          >
              {loadingNlQuery ? 'Processing...' : 'Query'}
          </Button>
          {nlQueryResults.length > 0 && (
              <Box sx={{ mt: 2, p: 1, border: '1px solid #4CAF50', borderRadius: '4px', backgroundColor: '#2a2a2a', maxHeight: '150px', overflow: 'auto' }}>
                <Typography variant="caption" style={{ color: '#4CAF50', fontWeight: 'bold' }}>Results ({nlQueryResults.length}):</Typography>
              {nlQueryResults.map((result, index) => (
                  <Box key={index} sx={{ mt: 1, p: 1, backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
                    <Typography variant="caption" style={{ color: '#FFD700', fontSize: '0.7rem' }}>📊 {result.source}</Typography>
                    <Typography variant="caption" style={{ color: 'white', fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                      {typeof result.result === 'string' ? result.result.substring(0, 100) + '...' : JSON.stringify(result.result).substring(0, 100) + '...'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

          {/* Natural Language to Rule Converter */}
          <Box sx={{
            p: 2,
            border: '1px solid #555',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>🔧 NL to Rule Converter</Typography>
          <TextField
            fullWidth
              size="small"
              label="Describe your rule"
            value={nlRuleInput}
            onChange={(e) => setNlRuleInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNlRuleConversion();
              }
            }}
            sx={{
                mb: 1,
                '& .MuiInputBase-input': { color: 'white', fontSize: '0.85rem' },
                '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            }}
          />
          <Button
            variant="contained"
              size="small"
            onClick={handleNlRuleConversion}
            disabled={loadingNlRuleConversion || (!clientsData.length && !workersData.length && !tasksData.length)}
              startIcon={loadingNlRuleConversion && <CircularProgress size={16} color="inherit" />}
              sx={{ backgroundColor: '#1976D2', color: 'white', '&:hover': { backgroundColor: '#1565C0' }, fontSize: '0.8rem' }}
          >
              {loadingNlRuleConversion ? 'Converting...' : 'Convert'}
          </Button>
        </Box>

          {/* AI Rule Recommendations */}
          <Box sx={{
            p: 2,
            border: '1px solid #555',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>🤖 AI Rule Recommendations</Typography>
          <Button
            variant="contained"
              size="small"
            onClick={handleGenerateRuleRecommendations}
            disabled={loadingRuleRecommendations || (!clientsData.length && !workersData.length && !tasksData.length)}
              startIcon={loadingRuleRecommendations && <CircularProgress size={16} color="inherit" />}
              sx={{ backgroundColor: '#FF9800', color: 'white', '&:hover': { backgroundColor: '#fb8c00' }, fontSize: '0.8rem' }}
          >
              {loadingRuleRecommendations ? 'Generating...' : 'Get Recommendations'}
          </Button>
          {suggestedRules.length > 0 && (
              <Box sx={{ mt: 2, p: 1, border: '1px solid #FF9800', borderRadius: '4px', backgroundColor: '#333', maxHeight: '150px', overflow: 'auto' }}>
                <Typography variant="caption" style={{ color: '#FF9800', fontWeight: 'bold' }}>Rules ({suggestedRules.length}):</Typography>
                {suggestedRules.map((rule, index) => (
                  <Box key={index} sx={{ mt: 1, p: 1, backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
                    <Typography variant="caption" style={{ color: '#eee', fontSize: '0.7rem' }}><strong>{rule.type}</strong></Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddSuggestedRule(rule)}
                      sx={{ ml: 1, py: 0, px: 1, borderColor: '#FF9800', color: '#FF9800', fontSize: '0.7rem', minWidth: 'auto' }}
                    >
                      Add
                    </Button>
                  </Box>
                ))}
            </Box>
          )}
        </Box>

          {/* Natural Language Data Modification */}
          <Box sx={{
            p: 2,
            border: '1px solid #555',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>✏️ Data Modification</Typography>
          <TextField
            fullWidth
              size="small"
              label="Modify your data"
            value={nlDataModificationInput}
            onChange={(e) => setNlDataModificationInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNlDataModification();
              }
            }}
            sx={{
                mb: 1,
                '& .MuiInputBase-input': { color: 'white', fontSize: '0.85rem' },
                '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#777' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            }}
          />
          <Button
            variant="contained"
              size="small"
            onClick={handleNlDataModification}
            disabled={loadingNlDataModification || (!clientsData.length && !workersData.length && !tasksData.length)}
              startIcon={loadingNlDataModification && <CircularProgress size={16} color="inherit" />}
              sx={{ backgroundColor: '#9C27B0', color: 'white', '&:hover': { backgroundColor: '#7b1fa2' }, fontSize: '0.8rem' }}
          >
              {loadingNlDataModification ? 'Modifying...' : 'Modify'}
          </Button>
        </Box>

          {/* AI-based Validator */}
          <Box sx={{
            p: 2,
            border: '1px solid #555',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '10px', fontSize: '1rem' }}>🔍 AI Validator</Typography>
          <Button
            variant="contained"
              size="small"
            onClick={handleAiValidation}
            disabled={loadingAiValidator || (!clientsData.length && !workersData.length && !tasksData.length)}
              startIcon={loadingAiValidator && <CircularProgress size={16} color="inherit" />}
              sx={{ backgroundColor: '#00BCD4', color: 'white', '&:hover': { backgroundColor: '#00acc1' }, fontSize: '0.8rem' }}
          >
              {loadingAiValidator ? 'Validating...' : 'Run Validation'}
          </Button>
          {inferredValidationIssues && (
              <Box sx={{ mt: 2, p: 1, border: '1px solid #FFC107', borderRadius: '4px', backgroundColor: '#332a00', maxHeight: '150px', overflow: 'auto' }}>
                <Typography variant="caption" style={{ color: '#FFC107', fontWeight: 'bold' }}>AI Issues Found:</Typography>
              {inferredValidationIssues.clientsErrors && (
                  <Typography variant="caption" style={{ color: '#eee', fontSize: '0.7rem', display: 'block' }}>Clients: {JSON.stringify(inferredValidationIssues.clientsErrors).substring(0, 50)}...</Typography>
              )}
              {inferredValidationIssues.workersErrors && (
                  <Typography variant="caption" style={{ color: '#eee', fontSize: '0.7rem', display: 'block' }}>Workers: {JSON.stringify(inferredValidationIssues.workersErrors).substring(0, 50)}...</Typography>
              )}
              {inferredValidationIssues.tasksErrors && (
                  <Typography variant="caption" style={{ color: '#eee', fontSize: '0.7rem', display: 'block' }}>Tasks: {JSON.stringify(inferredValidationIssues.tasksErrors).substring(0, 50)}...</Typography>
              )}
            </Box>
          )}
        </Box>
        </div>

        {/* Validation Summary Section */}
        {(clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0) && (
          <Box sx={{ 
            mb: 4, 
            p: 2, 
            border: Object.keys(validationErrors).length > 0 ? '2px solid #d32f2f' : '2px solid #4CAF50', 
            borderRadius: '8px', 
            backgroundColor: Object.keys(validationErrors).length > 0 ? '#331a1a' : '#1a331a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}>
            <Typography variant="h5" component="h2" style={{ 
              color: Object.keys(validationErrors).length > 0 ? '#d32f2f' : '#4CAF50', 
              marginBottom: '10px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              📋 Validation Summary
            </Typography>
            
            {Object.keys(validationErrors).length > 0 ? (
              <>
                <Typography variant="body2" style={{ color: '#ff7961', marginBottom: '10px', textAlign: 'center' }}>
                  ⚠️ Found {Object.values(validationErrors).flat().length} validation issue(s)
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                {Object.entries(validationErrors).map(([type, errors]) => (
                    <Box key={type} sx={{ p: 1, backgroundColor: '#2a1a1a', borderRadius: '4px', border: '1px solid #555' }}>
                      <Typography variant="subtitle2" component="h3" style={{ color: '#ff7961', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        📊 {type.charAt(0).toUpperCase() + type.slice(1)} ({errors.length})
                    </Typography>
                      <Box sx={{ maxHeight: '100px', overflow: 'auto', mt: 1 }}>
                      {errors.map((error, index) => (
                          <Typography key={index} variant="caption" style={{ color: '#ef9a9a', display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>
                            • {error.length > 60 ? error.substring(0, 60) + '...' : error}
                          </Typography>
                      ))}
                      </Box>
                  </Box>
                ))}
                </div>
                <div className="text-center">
                <Button
                  variant="contained"
                    size="small"
                  onClick={handleSuggestErrorCorrection}
                    disabled={loadingErrorCorrection || Object.keys(validationErrors).length === 0}
                    startIcon={loadingErrorCorrection && <CircularProgress size={16} color="inherit" />}
                    sx={{ backgroundColor: '#d32f2f', color: 'white', '&:hover': { backgroundColor: '#b71c1c' }, fontSize: '0.8rem' }}
                >
                  {loadingErrorCorrection ? 'Processing...' : 'Suggest Error Corrections'}
                </Button>
                </div>
              </>
            ) : (
              <Typography variant="body1" style={{ color: '#4CAF50', fontSize: '1rem', textAlign: 'center' }}>
                ✅ All data passed validation! No errors found.
              </Typography>
            )}
          </Box>
        )}

        {suggestedCorrections && (
          <Box sx={{ mb: 4, p: 2, border: '1px solid #4CAF50', borderRadius: '8px', backgroundColor: '#214a24', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }}>
            <Typography variant="h6" component="h3" style={{ color: '#81c784', marginBottom: '10px', fontSize: '1rem', textAlign: 'center' }}>✅ Suggested Corrections Available</Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            {/* Type safely check for data corrections */}
            {(suggestedCorrections as ValidationIssues & { clientsData?: DataRow[] }).clientsData && (
                <Box sx={{ p: 1, backgroundColor: '#1a331a', borderRadius: '4px', border: '1px solid #4CAF50' }}>
                  <Typography variant="caption" style={{ color: '#a5d6a7', fontWeight: 'bold', fontSize: '0.8rem' }}>Clients Data ({(suggestedCorrections as ValidationIssues & { clientsData?: DataRow[] }).clientsData?.length} items)</Typography>
              </Box>
            )}
            {(suggestedCorrections as ValidationIssues & { workersData?: DataRow[] }).workersData && (
                <Box sx={{ p: 1, backgroundColor: '#1a331a', borderRadius: '4px', border: '1px solid #4CAF50' }}>
                  <Typography variant="caption" style={{ color: '#a5d6a7', fontWeight: 'bold', fontSize: '0.8rem' }}>Workers Data ({(suggestedCorrections as ValidationIssues & { workersData?: DataRow[] }).workersData?.length} items)</Typography>
              </Box>
            )}
            {(suggestedCorrections as ValidationIssues & { tasksData?: DataRow[] }).tasksData && (
                <Box sx={{ p: 1, backgroundColor: '#1a331a', borderRadius: '4px', border: '1px solid #4CAF50' }}>
                  <Typography variant="caption" style={{ color: '#a5d6a7', fontWeight: 'bold', fontSize: '0.8rem' }}>Tasks Data ({(suggestedCorrections as ValidationIssues & { tasksData?: DataRow[] }).tasksData?.length} items)</Typography>
              </Box>
            )}
            </div>
            <div className="text-center">
            <Button
              variant="contained"
                size="small"
              onClick={handleApplySuggestedCorrections}
                sx={{ backgroundColor: '#4CAF50', color: 'white', '&:hover': { backgroundColor: '#45a049' }, fontSize: '0.8rem' }}
            >
              Apply Suggested Corrections
            </Button>
            </div>
          </Box>
        )}

        {/* Rule Definition and Prioritization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Rule Input */}
          <Box sx={{ 
            p: 2, 
            border: '1px solid #555', 
            borderRadius: '8px', 
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '15px', fontSize: '1.1rem', textAlign: 'center' }}>📋 Define Business Rules</Typography>
          <RuleInput onAddRule={handleAddRule} />
        </Box>

          {/* Prioritization Input */}
          <Box sx={{ 
            p: 2, 
            border: '1px solid #555', 
            borderRadius: '8px', 
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.6)' },
          }}>
            <Typography variant="h6" component="h2" style={{ color: 'white', marginBottom: '15px', fontSize: '1.1rem', textAlign: 'center' }}>⚖️ Set Prioritization Weights</Typography>
            <PrioritizationInput onSettingsChange={handleUpdatePriorities} />
          </Box>
        </div>

        {/* Smart Data Analytics & Insights Section */}
        <Box sx={{ 
          p: 3, 
          border: '1px solid #555', 
          borderRadius: '12px', 
          backgroundColor: '#1a1a1a',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)' },
          mb: 4
        }}>
          <Typography variant="h5" component="h2" style={{ 
            color: 'white', 
            marginBottom: '20px', 
            fontSize: '1.3rem', 
            textAlign: 'center',
            background: 'linear-gradient(45deg, #6366F1, #8B5CF6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🧠 Smart Data Analytics & Insights
          </Typography>
          <DataInsights 
            clientsData={clientsData as ClientDataWithId[]}
            workersData={workersData as WorkerDataWithId[]}
            tasksData={tasksData as TaskDataWithId[]}
          />
        </Box>

        {/* Defined Rules Display */}
        {definedRules.length > 0 && (
          <Box sx={{ 
            mb: 4, 
            p: 2, 
            border: '2px solid #4CAF50', 
            borderRadius: '8px', 
            backgroundColor: '#1a331a',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
          }}>
            <Typography variant="h5" component="h2" style={{ 
              color: '#4CAF50', 
              marginBottom: '15px',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              🎯 Defined Rules ({definedRules.length})
            </Typography>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {definedRules.map((rule, index) => (
              <Box key={index} sx={{ 
                p: 2, 
                backgroundColor: '#0d1117',
                borderRadius: '6px',
                border: '1px solid #4CAF50'
              }}>
                  <Typography variant="subtitle1" style={{ 
                  color: '#FFD700', 
                  fontWeight: 'bold',
                    marginBottom: '8px',
                    fontSize: '0.9rem'
                }}>
                  📋 Rule #{index + 1}: {rule.type}
                </Typography>
                  <Box sx={{ 
                  backgroundColor: '#2a2a2a',
                    padding: '8px',
                  borderRadius: '4px',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    <Typography variant="caption" style={{ 
                      color: 'white',
                  fontFamily: 'monospace',
                      fontSize: '0.7rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(rule, null, 2)}
                </Typography>
                  </Box>
              </Box>
            ))}
            </div>
            
            <div className="text-center">
            <Button
              variant="contained"
                size="small"
              onClick={handleGenerateRulesConfig}
              disabled={definedRules.length === 0}
              sx={{ 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                  fontSize: '0.85rem',
                '&:hover': { backgroundColor: '#45a049' } 
              }}
            >
              📄 Generate Rules Config File
            </Button>
            </div>
          </Box>
        )}

        {/* Export Data Section */}
        <div className="text-center mb-6">
          <Button
            variant="contained"
            size="medium"
            onClick={handleExportAllData}
            disabled={!(clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0 || definedRules.length > 0 || Object.keys(prioritizationSettings).length > 0)}
            sx={{ backgroundColor: '#607D8B', color: 'white', '&:hover': { backgroundColor: '#455a64' }, fontSize: '0.9rem' }}
          >
            📤 Export All Data
          </Button>
        </div>

      </main>
    </div>
  );
}
