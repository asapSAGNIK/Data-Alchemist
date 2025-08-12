import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type { DataWithId } from '@/types';

const queryDataWithAI = async (query: string, data: DataWithId[], dataType: string) => {
  if (!data || data.length === 0) return null;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const dataContext = JSON.stringify(data, null, 2);
  const prompt = `You are analyzing ${dataType} data. Here is the data:

${dataContext}

Query: ${query}

Please provide a clear, direct answer to this query. For counting questions, just give the number and explanation. For data questions, provide relevant information. Be concise but helpful.

Answer:`;

  try {
    console.log(`[DEBUG] Querying ${dataType} with prompt length:`, prompt.length);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    console.log(`[DEBUG] ${dataType} response:`, responseText?.substring(0, 200));
    return responseText;
  } catch (error) {
    console.error(`Error querying ${dataType} data:`, error);
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    const { query, clientsData, workersData, tasksData } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const allResults: Array<{ source: 'clients' | 'workers' | 'tasks'; result: string }> = [];

    // Process each dataset
    console.log(`[DEBUG] Processing query: "${query}" with data lengths - clients: ${clientsData?.length}, workers: ${workersData?.length}, tasks: ${tasksData?.length}`);
    
    const clientsResult = await queryDataWithAI(query, clientsData, "clients");
    const workersResult = await queryDataWithAI(query, workersData, "workers");
    const tasksResult = await queryDataWithAI(query, tasksData, "tasks");

    console.log(`[DEBUG] Results - clients: ${!!clientsResult}, workers: ${!!workersResult}, tasks: ${!!tasksResult}`);

    if (clientsResult) {
      allResults.push({ source: "clients", result: clientsResult });
    }
    if (workersResult) {
      allResults.push({ source: "workers", result: workersResult });
    }
    if (tasksResult) {
      allResults.push({ source: "tasks", result: tasksResult });
    }

    console.log(`[DEBUG] Final results array length:`, allResults.length);
    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error('Natural language query API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process natural language query.', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}