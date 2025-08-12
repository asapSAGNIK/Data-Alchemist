/**
 * Universal robust JSON extraction utility for AI responses
 * Handles all common AI response formats that may contain extra text
 */

export interface ParseResult<T = unknown> {
  success: boolean;
  data: T | null;
  error?: string;
  originalText?: string;
}

/**
 * Robust JSON extraction from AI responses
 * @param text The raw AI response text
 * @param expectedType 'object' | 'array' - what type of JSON structure is expected
 * @returns ParseResult with extracted data or error information
 */
export function extractJSONFromAIResponse<T = unknown>(
  text: string, 
  expectedType: 'object' | 'array' = 'object'
): ParseResult<T> {
  
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      data: null,
      error: 'Invalid input: text is null or not a string',
      originalText: text
    };
  }

  const cleanedText = text.trim();
  
  // Strategy 1: Try direct JSON parsing (best case)
  try {
    const parsed = JSON.parse(cleanedText);
    if (validateType(parsed, expectedType)) {
      return {
        success: true,
        data: parsed,
        originalText: cleanedText
      };
    }
  } catch {
    // Continue to other strategies
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockPattern = expectedType === 'array' 
    ? /```(?:json)?\s*(\[[\s\S]*?\])\s*```/i
    : /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
    
  const codeBlockMatch = cleanedText.match(codeBlockPattern);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (validateType(parsed, expectedType)) {
        return {
          success: true,
          data: parsed,
          originalText: cleanedText
        };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find JSON objects/arrays in the text using improved regex
  const jsonPattern = expectedType === 'array'
    ? /\[[^\[\]]*(?:\{[^{}]*\}[^\[\]]*)*\]/
    : /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
    
  const jsonMatch = cleanedText.match(jsonPattern);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (validateType(parsed, expectedType)) {
        return {
          success: true,
          data: parsed,
          originalText: cleanedText
        };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Look for JSON after common AI prefixes
  const patterns = expectedType === 'array' ? [
    /(?:Rules:|Recommendations:|Array:|Output:|Results?:)\s*(\[[\s\S]*?\])/i,
    /(?:Here (?:are|is)|Suggested)\s+.*?:\s*(\[[\s\S]*?\])/i,
    /^\s*(\[[\s\S]*?\])\s*$/
  ] : [
    /(?:Issues?:|Corrections?:|Object:|Output:|Results?:)\s*(\{[\s\S]*?\})/i,
    /(?:Here (?:are|is)|Suggested)\s+.*?:\s*(\{[\s\S]*?\})/i,
    /^\s*(\{[\s\S]*?\})\s*$/
  ];

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (validateType(parsed, expectedType)) {
          return {
            success: true,
            data: parsed,
            originalText: cleanedText
          };
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Strategy 5: Handle common AI "no result" responses
  const noResultIndicators = [
    'no rules', 'no patterns', 'empty array', 'no issues', 
    'no problems', 'no corrections', 'cannot', 'unclear'
  ];
  
  const hasNoResultIndicator = noResultIndicators.some(indicator => 
    cleanedText.toLowerCase().includes(indicator)
  );
  
  if (hasNoResultIndicator) {
    const emptyResult = expectedType === 'array' ? [] : {};
    return {
      success: true,
      data: emptyResult as T,
      originalText: cleanedText
    };
  }

  // Strategy 6: Last resort - try to extract any valid JSON structure
  const anyJsonMatch = cleanedText.match(/[\{\[][\s\S]*?[\}\]]/);
  if (anyJsonMatch) {
    try {
      const parsed = JSON.parse(anyJsonMatch[0]);
      return {
        success: true,
        data: parsed,
        originalText: cleanedText
      };
    } catch {
      // Final failure
    }
  }

  return {
    success: false,
    data: null,
    error: `Could not extract valid ${expectedType} from AI response`,
    originalText: cleanedText
  };
}

/**
 * Validates that the parsed data matches the expected type
 */
function validateType(data: unknown, expectedType: 'object' | 'array'): boolean {
  if (expectedType === 'array') {
    return Array.isArray(data);
  } else {
    return typeof data === 'object' && data !== null && !Array.isArray(data);
  }
}

/**
 * Convenience function for extracting JSON arrays (for rules, recommendations, etc.)
 */
export function extractJSONArray<T = unknown>(text: string): ParseResult<T[]> {
  return extractJSONFromAIResponse<T[]>(text, 'array');
}

/**
 * Convenience function for extracting JSON objects (for corrections, validation issues, etc.)
 */
export function extractJSONObject<T = unknown>(text: string): ParseResult<T> {
  return extractJSONFromAIResponse<T>(text, 'object');
}
