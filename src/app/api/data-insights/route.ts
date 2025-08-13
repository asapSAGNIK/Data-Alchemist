import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robust JSON extraction from AI responses
 */
function extractJSONFromAIResponse(text: string): Record<string, unknown> | null {
  // Remove markdown code blocks if present
  let cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
  
  // Try to find JSON object boundaries
  const jsonStart = cleanText.indexOf('{');
  const jsonEnd = cleanText.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
  }

  // Try parsing the cleaned text
  try {
    const parsed = JSON.parse(cleanText);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // If direct parsing fails, try to extract JSON from within the text
    const jsonRegex = /\{[\s\S]*\}/;
    const match = cleanText.match(jsonRegex);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (_e2) {
        console.warn('[DEBUG] Secondary JSON parsing failed:', _e2);
      }
    }
  }

  // Final fallback: try to parse as array if it looks like one
  if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
    try {
      return JSON.parse(cleanText);
    } catch (_e) {
      console.warn('[DEBUG] Array parsing failed:', _e);
    }
  }

  console.error('[DEBUG] Could not extract JSON from:', text);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { clientsData, workersData, tasksData }: {
      clientsData?: Record<string, unknown>[];
      workersData?: Record<string, unknown>[];
      tasksData?: Record<string, unknown>[];
    } = await req.json();

    if (!clientsData && !workersData && !tasksData) {
      return NextResponse.json({ error: 'No data provided for analysis.' }, { status: 400 });
    }

    // Calculate basic statistics
    const stats = {
      totalClients: clientsData?.length || 0,
      totalWorkers: workersData?.length || 0,
      totalTasks: tasksData?.length || 0,
      highPriorityClients: clientsData?.filter((c) => Number(c.PriorityLevel) >= 4).length || 0,
      uniqueSkills: new Set(workersData?.flatMap((w) => String(w.Skills || '').split(',').map(s => s.trim()).filter(s => s)) || []).size,
      totalPhases: Math.max(...(workersData?.flatMap((w) => String(w.AvailableSlots || '').split(',').map(Number).filter(n => !isNaN(n))) || [1])),
    };

    const systemPrompt = `You are an AI business analyst that provides smart insights from resource allocation data.

CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no extra text.

Task: Analyze the data patterns and provide actionable business insights.

Current Statistics:
- Total Clients: ${stats.totalClients}
- Total Workers: ${stats.totalWorkers} 
- Total Tasks: ${stats.totalTasks}
- High Priority Clients: ${stats.highPriorityClients}
- Unique Skills: ${stats.uniqueSkills}
- Total Phases: ${stats.totalPhases}

Response Format:
{
  "keyInsights": [
    {
      "title": "Insight Title",
      "description": "Detailed insight description",
      "type": "warning|success|info|critical",
      "impact": "high|medium|low",
      "actionable": "Specific recommendation"
    }
  ],
  "bottlenecks": [
    {
      "area": "Phase/Skill/Worker",
      "severity": "high|medium|low", 
      "description": "What the bottleneck is",
      "recommendation": "How to fix it"
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "What opportunity exists",
      "benefit": "Expected benefit",
      "effort": "low|medium|high"
    }
  ],
  "riskAlerts": [
    {
      "risk": "Risk description",
      "probability": "high|medium|low",
      "mitigation": "How to mitigate"
    }
  ]
}

Analyze patterns like:
- Worker capacity vs task demands
- Skill coverage gaps
- Phase distribution imbalances  
- Priority level distributions
- Overloaded workers or phases
- Underutilized resources
- Client request patterns

Data:
Clients: ${JSON.stringify(clientsData)}
Workers: ${JSON.stringify(workersData)}
Tasks: ${JSON.stringify(tasksData)}

Response (JSON only):`;

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`[DEBUG] Generating insights for ${stats.totalClients} clients, ${stats.totalWorkers} workers, ${stats.totalTasks} tasks`);

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log(`[DEBUG] AI insights response:`, responseText);

    // Use robust JSON extraction
    const extractedInsights = extractJSONFromAIResponse(responseText);

    if (extractedInsights) {
      console.log(`[DEBUG] Successfully extracted insights:`, extractedInsights);
      return NextResponse.json({ 
        insights: extractedInsights,
        statistics: stats 
      });
    } else {
      console.error(`[DEBUG] Could not extract valid insights from response:`, responseText);
      return NextResponse.json({
        error: 'Could not extract valid insights from AI response',
        details: responseText,
        fallbackInsights: {
          keyInsights: [
            {
              title: "Data Analysis Complete",
              description: `Analyzed ${stats.totalClients} clients, ${stats.totalWorkers} workers, and ${stats.totalTasks} tasks successfully.`,
              type: "info",
              impact: "medium",
              actionable: "Review data quality and completeness."
            }
          ],
          bottlenecks: [],
          opportunities: [],
          riskAlerts: []
        },
        statistics: stats
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Data insights API error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate data insights.', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
