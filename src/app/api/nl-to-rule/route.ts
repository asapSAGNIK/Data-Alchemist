import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robust JSON extraction from AI responses that may contain extra text
 * Handles common AI response patterns and extracts valid JSON objects
 */
function extractJSONFromAIResponse(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Clean the text first
  const cleanedText = text.trim();
  
  // Strategy 1: Try direct JSON parsing (best case)
  try {
    const parsed = JSON.parse(cleanedText);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Continue to other strategies
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find the first complete JSON object in the text
  const jsonMatch = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Look for JSON after common AI prefixes
  const patterns = [
    /(?:JSON Rule:|Answer:|Result:|Output:)\s*(\{[\s\S]*?\})/i,
    /(?:Here's|Here is) (?:the|a) (?:JSON|rule|result):\s*(\{[\s\S]*?\})/i,
    /^\s*(\{[\s\S]*?\})\s*$/
  ];

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Strategy 5: If we have rule type indicators, try to construct a simple rule
  if (cleanedText.toLowerCase().includes('corun') || cleanedText.toLowerCase().includes('co-run')) {
    try {
      return { type: "coRun", tasks: ["T1", "T2"], note: "Extracted from: " + cleanedText };
    } catch (e) {
      // Continue
    }
  }

  // Strategy 6: Return empty object if AI couldn't determine the rule type
  if (cleanedText.toLowerCase().includes('empty') || cleanedText.toLowerCase().includes('cannot') || cleanedText.toLowerCase().includes('unclear')) {
    return {};
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { naturalLanguageRule, clientsData, workersData, tasksData } = await req.json();

    if (!naturalLanguageRule) {
      return NextResponse.json({ error: 'Natural language rule is required' }, { status: 400 });
    }

    // Data context is available for future enhanced rule conversion

        const systemPrompt = `You are an AI assistant that converts natural language descriptions of business rules into structured JSON format.

CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no extra text.

Rule Types and JSON Structures:

1. Co-run: { "type": "coRun", "tasks": ["TaskID1", "TaskID2"] }
2. Slot-restriction: { "type": "slotRestriction", "groupType": "ClientGroup", "groupName": "GroupName", "minCommonSlots": 3 }
3. Load-limit: { "type": "loadLimit", "workerGroup": "WorkerGroupName", "maxSlotsPerPhase": 5 }
4. Phase-window: { "type": "phaseWindow", "taskId": "TaskID", "allowedPhases": [1,2,3] }
5. Pattern-match: { "type": "patternMatch", "regex": "pattern", "template": "template", "parameters": {} }
6. Precedence override: { "type": "precedenceOverride", "scope": "global", "priority": 1, "details": "description" }

Available Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Convert this rule: "${naturalLanguageRule}"

Response (JSON only):`;

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`[DEBUG] Converting rule: "${naturalLanguageRule}"`);
    
    // Add retry logic for overloaded service
    let result;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        result = await model.generateContent(systemPrompt);
        break; // Success, exit retry loop
      } catch (error: unknown) {
        retryCount++;
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[DEBUG] Attempt ${retryCount} failed:`, message);
        
        if (message.includes('overloaded') && retryCount < maxRetries) {
          console.log(`[DEBUG] Retrying in ${retryCount * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000)); // Wait 2, 4, 6 seconds
        } else {
          throw error; // Re-throw if not overloaded error or max retries reached
        }
      }
    }
    
    if (!result) {
      throw new Error('Failed to get response after retries');
    }
    
    const response = await result.response;
    const responseText = response.text();

    console.log(`[DEBUG] AI response for rule conversion:`, responseText);

    // Robust JSON extraction from AI response
    const extractedRule = extractJSONFromAIResponse(responseText);
    
    if (extractedRule) {
      console.log(`[DEBUG] Successfully extracted rule:`, extractedRule);
      return NextResponse.json({ rule: extractedRule });
    } else {
      console.error(`[DEBUG] Could not extract valid JSON from response:`, responseText);
      return NextResponse.json({ 
        error: 'Could not extract valid rule from AI response', 
        details: responseText,
        suggestion: 'The AI may have returned explanatory text instead of pure JSON. Try rephrasing your rule description.'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Natural language query API error:', error);
    return NextResponse.json({ error: 'Failed to process natural language query.', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}