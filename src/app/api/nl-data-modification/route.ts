import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robust JSON extraction from AI responses for data modification
 * Handles AI responses that may contain extra text or formatting
 */
function extractJSONFromAIResponse(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') {
    console.log('[DEBUG] Invalid input text:', text);
    return null;
  }

  const cleanedText = text.trim();
  console.log('[DEBUG] Attempting to extract JSON from:', cleanedText);
  
  // Strategy 1: Direct JSON parsing (for clean responses)
  try {
    const parsed = JSON.parse(cleanedText);
    console.log('[DEBUG] Direct JSON parse successful:', parsed);
    return parsed;
  } catch (e) {
    console.log('[DEBUG] Direct JSON parse failed, trying other strategies');
  }

  // Strategy 2: Extract from markdown code blocks (like successful Rule Conversion)
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      console.log('[DEBUG] Markdown extraction successful:', parsed);
      return parsed;
    } catch (e) {
      console.log('[DEBUG] Markdown extraction failed:', e.message);
    }
  }

  // Strategy 2b: Handle multi-line markdown code blocks with newlines
  const multilineCodeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (multilineCodeBlockMatch) {
    try {
      const content = multilineCodeBlockMatch[1].trim();
      const parsed = JSON.parse(content);
      console.log('[DEBUG] Multi-line markdown extraction successful:', parsed);
      return parsed;
    } catch (e) {
      console.log('[DEBUG] Multi-line markdown extraction failed:', e.message);
    }
  }

  // Strategy 3: Simple JSON object extraction
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[DEBUG] Simple JSON extraction successful:', parsed);
      return parsed;
    } catch (e) {
      console.log('[DEBUG] Simple JSON extraction failed');
    }
  }

  // Strategy 4: Look for specific data format patterns
  const clientsDataMatch = cleanedText.match(/"clientsData"\s*:\s*(\[[\s\S]*?\])/);
  if (clientsDataMatch) {
    try {
      const clientsArray = JSON.parse(clientsDataMatch[1]);
      const result = { clientsData: clientsArray };
      console.log('[DEBUG] ClientsData pattern extraction successful:', result);
      return result;
    } catch (e) {
      console.log('[DEBUG] ClientsData pattern extraction failed');
    }
  }

  const workersDataMatch = cleanedText.match(/"workersData"\s*:\s*(\[[\s\S]*?\])/);
  if (workersDataMatch) {
    try {
      const workersArray = JSON.parse(workersDataMatch[1]);
      const result = { workersData: workersArray };
      console.log('[DEBUG] WorkersData pattern extraction successful:', result);
      return result;
    } catch (e) {
      console.log('[DEBUG] WorkersData pattern extraction failed');
    }
  }

  const tasksDataMatch = cleanedText.match(/"tasksData"\s*:\s*(\[[\s\S]*?\])/);
  if (tasksDataMatch) {
    try {
      const tasksArray = JSON.parse(tasksDataMatch[1]);
      const result = { tasksData: tasksArray };
      console.log('[DEBUG] TasksData pattern extraction successful:', result);
      return result;
    } catch (e) {
      console.log('[DEBUG] TasksData pattern extraction failed');
    }
  }

  // Strategy 5: Handle empty responses or failures
  if (cleanedText === '{}' || cleanedText.length < 5) {
    console.log('[DEBUG] Detected empty or minimal response:', cleanedText);
    return null;
  }

  console.log('[DEBUG] All extraction strategies failed');
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { naturalLanguageModification, clientsData, workersData, tasksData } = await req.json();

    if (!naturalLanguageModification) {
      return NextResponse.json({ error: 'Natural language modification query is required' }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant that modifies data based on natural language instructions.

CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no extra text.

You will receive data and a modification request. Find the matching item and return the COMPLETE modified dataset.

Data Structure:
- Clients have fields: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON
- Workers have fields: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel
- Tasks have fields: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Examples:
Request: "Change client 1 priority to 5"
Response: {"clientsData": [{"ClientID": "1", "ClientName": "ClientA", "PriorityLevel": 5, "RequestedTaskIDs": "T1,T2", "GroupTag": "GroupAlpha", "AttributesJSON": "{\"location\":\"NY\"}"}]}

Request: "Set task T1 duration to 3"
Response: {"tasksData": [{"TaskID": "T1", "TaskName": "Task1", "Category": "Development", "Duration": 3, "RequiredSkills": "Python", "PreferredPhases": "1,2", "MaxConcurrent": 2}]}

Current Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Modification Request: "${naturalLanguageModification}"

Important: 
1. Find the exact item to modify using IDs or names
2. Return ONLY the modified dataset array (clientsData, workersData, or tasksData)
3. Include ALL items in that dataset, not just the modified one
4. Keep all original fields exactly the same except the field being modified
5. Use the exact field names and structure as shown in the current data

Response (JSON only):`;

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`[DEBUG] Processing data modification: "${naturalLanguageModification}"`);
    console.log(`[DEBUG] Data sizes - clients: ${clientsData?.length || 0}, workers: ${workersData?.length || 0}, tasks: ${tasksData?.length || 0}`);
    
    let result = await model.generateContent(systemPrompt);
    let response = await result.response;
    let responseText = response.text();

    // If we get an empty response, try with a simpler prompt
    if (!responseText || responseText.trim() === '{}' || responseText.trim().length < 5 || responseText.trim() === 'null') {
      console.log(`[DEBUG] First attempt failed, trying simpler prompt`);
      
      const simplePrompt = `Task: Modify data based on this request: "${naturalLanguageModification}"

Available Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Instructions:
1. Identify which dataset needs modification
2. Find the specific item to modify
3. Make the requested change
4. Return the COMPLETE modified dataset

Return format examples:
- For clients: {"clientsData": [all client objects with the modification]}
- For workers: {"workersData": [all worker objects with the modification]}
- For tasks: {"tasksData": [all task objects with the modification]}

Response (valid JSON only):`;

      result = await model.generateContent(simplePrompt);
      response = await result.response;
      responseText = response.text();
      console.log(`[DEBUG] Second attempt response:`, responseText);
    }

    console.log(`[DEBUG] Raw AI response:`, responseText);
    console.log(`[DEBUG] Response type:`, typeof responseText);
    console.log(`[DEBUG] Response length:`, responseText?.length || 0);

    // Use simplified JSON extraction
    const extractedData = extractJSONFromAIResponse(responseText);
    console.log(`[DEBUG] Final extracted data:`, JSON.stringify(extractedData, null, 2));
    
    if (extractedData && typeof extractedData === 'object') {
      // Check if it's a valid modification (has at least one dataset)
      const hasValidData = extractedData.clientsData || extractedData.workersData || extractedData.tasksData;
      
      if (hasValidData) {
        console.log(`[DEBUG] Successfully processed data modification`);
        return NextResponse.json({ modifiedData: extractedData });
      }
    }

    // If we get here, the modification failed
    console.error(`[DEBUG] Modification failed - Raw response:`, responseText);
    
    // Provide better suggestions based on available data
    let suggestion = 'Try being more specific.';
    if (clientsData.length > 0) {
      const clientIds = clientsData.map(c => c.ClientID).slice(0, 3).join(', ');
      suggestion = `Available Client IDs: ${clientIds}. Try: "Change client ${clientsData[0].ClientID} priority to 5"`;
    } else if (workersData.length > 0) {
      const workerIds = workersData.map(w => w.WorkerID).slice(0, 3).join(', ');
      suggestion = `Available Worker IDs: ${workerIds}. Try: "Set worker ${workersData[0].WorkerID} max load to 10"`;
    } else if (tasksData.length > 0) {
      const taskIds = tasksData.map(t => t.TaskID).slice(0, 3).join(', ');
      suggestion = `Available Task IDs: ${taskIds}. Try: "Set task ${tasksData[0].TaskID} duration to 3"`;
    }
    
    return NextResponse.json({ 
      error: 'AI could not interpret the modification or returned an invalid format.', 
      details: `AI responded with: "${responseText}"`,
      suggestion: suggestion
    }, { status: 400 });
  } catch (error) {
    console.error('Natural language data modification API error:', error);
    return NextResponse.json({ error: 'Failed to process natural language data modification.', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}