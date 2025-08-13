import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robust JSON extraction from AI responses for rule recommendations
 * Handles AI responses that may contain extra text or formatting
 */
function extractJSONFromAIResponse(text: string): unknown[] | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleanedText = text.trim();
  
  // Strategy 1: Try direct JSON parsing (best case)
  try {
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to other strategies
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find JSON arrays in the text
  const jsonArrayMatch = cleanedText.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/);
  if (jsonArrayMatch) {
    try {
      const parsed = JSON.parse(jsonArrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Look for JSON after common AI prefixes
  const patterns = [
    /(?:Suggested Rules:|Rules:|Recommendations:|Output:)\s*(\[[\s\S]*?\])/i,
    /(?:Here are|Here's) (?:the|some) (?:suggested|recommended) rules:\s*(\[[\s\S]*?\])/i,
    /^\s*(\[[\s\S]*?\])\s*$/
  ];

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Strategy 5: Return empty array if AI couldn't generate rules
  if (cleanedText.toLowerCase().includes('no rules') || 
      cleanedText.toLowerCase().includes('no patterns') || 
      cleanedText.toLowerCase().includes('empty array')) {
    return [];
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { clientsData, workersData, tasksData } = await req.json();

    const systemPrompt = `You are an AI assistant that analyzes data patterns to suggest business rules.

CRITICAL: Your response must be ONLY a valid JSON array. No explanations, no markdown, no extra text.

Rule Types:
1. Co-run: { "type": "coRun", "tasks": ["TaskID1", "TaskID2"] }
2. Slot-restriction: { "type": "slotRestriction", "groupType": "ClientGroup", "groupName": "GroupName", "minCommonSlots": 3 }
3. Load-limit: { "type": "loadLimit", "workerGroup": "WorkerGroupName", "maxSlotsPerPhase": 5 }
4. Phase-window: { "type": "phaseWindow", "taskId": "TaskID", "allowedPhases": [1,2,3] }
5. Pattern-match: { "type": "patternMatch", "regex": "pattern", "template": "template", "parameters": {} }
6. Precedence override: { "type": "precedenceOverride", "scope": "global", "priority": 1, "details": "description" }

Task: Analyze the data and suggest up to 3 beneficial rules. Return empty array [] if no strong patterns found.

Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Response (JSON array only):`;

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`[DEBUG] Generating rule recommendations for data sizes - clients: ${clientsData?.length}, workers: ${workersData?.length}, tasks: ${tasksData?.length}`);
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log(`[DEBUG] AI response for rule recommendations:`, responseText);

    // Use robust JSON extraction
    const extractedRules = extractJSONFromAIResponse(responseText);
    
    if (extractedRules !== null) {
      if (Array.isArray(extractedRules)) {
        console.log(`[DEBUG] Successfully extracted ${extractedRules.length} rule recommendations:`, extractedRules);
        return NextResponse.json({ rules: extractedRules });
      } else {
        console.error(`[DEBUG] Extracted data is not an array:`, extractedRules);
        return NextResponse.json({ 
          error: 'AI did not return valid rules array', 
          details: responseText,
          suggestion: 'The AI response format was unexpected. Try again or check if there is sufficient data for rule recommendations.'
        }, { status: 400 });
      }
    } else {
      console.error(`[DEBUG] Could not extract valid rules from response:`, responseText);
      return NextResponse.json({ 
        error: 'Could not extract valid rules from AI response', 
        details: responseText,
        suggestion: 'The AI may not have found clear patterns in your data. Try with more diverse or structured data.'
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error generating rule recommendations:", error);
    return NextResponse.json({ message: "Failed to generate rule recommendations." }, { status: 500 });
  }
}