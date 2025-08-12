import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `CRITICAL: Your response must be ONLY valid JSON. No explanations, no markdown, no extra text.

Generate a simple data modification example:
{"clientsData": [{"ClientID": "C1", "Name": "Test Corp", "PriorityLevel": 5}]}

Response (JSON only):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('[TEST] Raw Gemini response:', text);
    console.log('[TEST] Response length:', text.length);

    return NextResponse.json({ 
      success: true, 
      response: text,
      responseLength: text.length,
      message: "Google Gemini API connection test complete!"
    });
  } catch (error) {
    console.error('Gemini test error:', error);
    return NextResponse.json({ 
      error: 'Failed to test Gemini API', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
