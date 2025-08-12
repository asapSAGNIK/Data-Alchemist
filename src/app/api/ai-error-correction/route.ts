import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robust JSON extraction from AI responses that may contain extra text
 * Reusing the same robust extraction logic from nl-to-rule
 */
function extractJSONFromAIResponse(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

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
    /(?:Suggested Corrections:|Corrections:|Result:|Output:)\s*(\{[\s\S]*?\})/i,
    /(?:Here's|Here are) (?:the|some) (?:corrections|suggestions):\s*(\{[\s\S]*?\})/i,
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
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // Strategy 5: Return empty object if AI couldn't determine corrections
  if (cleanedText.toLowerCase().includes('no corrections') || 
      cleanedText.toLowerCase().includes('cannot correct') || 
      cleanedText.toLowerCase().includes('unclear')) {
    return {};
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { validationErrors, clientsData, workersData, tasksData } = await req.json();

    if (!validationErrors || Object.keys(validationErrors).length === 0) {
      return NextResponse.json({ error: 'No validation errors provided for correction.' }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant that suggests corrections for data validation errors.

CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no extra text.

Task: Analyze validation errors and provide corrected data arrays.

Response Format:
{
  "clientsData": [corrected client objects],
  "workersData": [corrected worker objects], 
  "tasksData": [corrected task objects]
}

Only include datasets that need corrections. Preserve all original fields and 'id' values.

Validation Errors: ${JSON.stringify(validationErrors, null, 2)}
Current Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Response (JSON only):`;

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`[DEBUG] Processing error correction for ${Object.keys(validationErrors).length} error types`);
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log(`[DEBUG] AI response for error correction:`, responseText);

    // Use robust JSON extraction
    const extractedCorrections = extractJSONFromAIResponse(responseText);
    
    if (extractedCorrections) {
      console.log(`[DEBUG] Successfully extracted corrections:`, extractedCorrections);
      return NextResponse.json({ suggestedCorrections: extractedCorrections });
    } else {
      console.error(`[DEBUG] Could not extract valid corrections from response:`, responseText);
      return NextResponse.json({ 
        error: 'Could not extract valid corrections from AI response', 
        details: responseText,
        suggestion: 'The AI may not have understood the validation errors clearly. Try running validation again or check if the errors are fixable.'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('AI error correction API error:', error);
    return NextResponse.json({ error: 'Failed to process AI error correction request.', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}