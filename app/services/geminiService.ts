
import { GoogleGenAI } from "@google/genai"
import { BusinessModelCanvasData, DashboardMetrics } from "../types"

/**
 * Analyzes the provided BusinessModelCanvas data using the Gemini API.
 * @param data The BusinessModelCanvasData object to analyze.
 * @returns A promise that resolves to the AI's analysis as a string.
 */
export async function analyzeBusinessModelCanvas(data: BusinessModelCanvasData): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY })

  const prompt = `Please analyze the following Business Model Canvas data. Identify key strengths, potential weaknesses, strategic opportunities, and any notable interdependencies between the components. Provide a concise summary (around 300-500 words) in an an easy-to-read format.

Business Model Canvas Data:
---
${data.strategy ? `
Core Strategy:
  Vision: ${data.strategy.vision || 'N/A'}
  Mission: ${data.strategy.mission || 'N/A'}
  Messaging Tone: ${data.strategy.messagingTone || 'N/A'}
  Brand Position: ${data.strategy.brandPosition || 'N/A'}
  Differentiated Value: ${data.strategy.differentiatedValue || 'N/A'}
  Market Category: ${data.strategy.marketCategory || 'N/A'}
  Design POV: ${data.strategy.designPov || 'N/A'}
  Category Entry Points: ${data.strategy.categoryEntryPoints || 'N/A'}
  Buying Situations: ${data.strategy.buyingSituations || 'N/A'}
  Distinctive Assets: ${data.strategy.distinctiveAssets || 'N/A'}
  Claude Panel Link: ${data.strategy.claudePanelLink || 'N/A'}
  Delta Score: ${data.strategy.deltaScore || 'N/A'}
  Current Solution Efficiency: ${data.strategy.currentSolutionEfficiency || 'N/A'}
  Our Solution Efficiency: ${data.strategy.ourSolutionEfficiency || 'N/A'}
` : ''}

Key Partners: ${data.keyPartners.map(p => `${p.name} (${p.status || 'N/A'})`).join(', ')}
Key Activities: ${data.keyActivities.map(a => `${a.name} (${a.category || 'N/A'})`).join(', ')}
Value Propositions: ${data.valuePropositions.map(vp => vp.description).join('; ')}
Customer Relations: ${data.customerRelations.map(cr => `${cr.type} (${cr.acquisitionStrategy || 'N/A'})`).join(', ')}
Customer Segments: ${data.customerSegments.map(cs => `${cs.name} (${cs.status}) - Promise: ${cs.promiseStatement || 'N/A'}, Platforms: ${cs.platforms?.join(', ') || 'N/A'}, Revenue: ${cs.nineMonthRevenue?.toLocaleString() || 'N/A'}, AOV: ${cs.aov?.toLocaleString() || 'N/A'}`).join(', ')}
Key Resources: ${data.keyResources.map(kr => `${kr.name} (${kr.type || 'N/A'})`).join(', ')}
Channels: ${data.channels.map(c => `${c.name} (${c.type}, ${c.motionType})`).join(', ')}
Revenue Streams: ${data.revenueStreams.map(rs => `${rs.streamName} (9-Month Rev: ${rs.nineMonthRevenue?.toLocaleString() || 'N/A'}, GM: ${rs.grossMargin || 'N/A'}%)`).join('; ')}
Cost Structure: ${data.costStructure.map(c => `${c.costName || c.category} (${c.type}) - Monthly: ${c.monthlyAmount?.toLocaleString() || 'N/A'}`).join('; ')}

Business Units: ${data.businessUnits.map(bu => `${bu.name} (Owner: ${bu.primaryOwner || 'N/A'}, Type: ${bu.buType || 'N/A'}, 9-Month Rev: ${bu.nineMonthRevenue?.toLocaleString() || 'N/A'})`).join(', ')}
Flywheels: ${data.flywheels.map(fl => `${fl.name} (Solves: ${fl.customerStruggleSolved || 'N/A'}, Motion: ${fl.motionSequence || 'N/A'})`).join(', ')}
Platforms: ${data.platforms.map(pl => `${pl.name} (${pl.type}, Status: ${pl.status || 'N/A'})`).join(', ')}
Team Members: ${data.team.map(tm => `${tm.fullName} (${tm.role})`).join(', ')}
Hubs: ${data.hubs.map(h => `${h.name} (Type: ${h.type || 'N/A'}, Headcount: ${h.headCount || 'N/A'})`).join(', ')}
Metrics: ${data.metrics.map(m => `${m.name} (Current: ${m.currentValue || 'N/A'}, Status: ${m.status || 'N/A'})`).join(', ')}
Gaps & Actions: ${data.gapsActions.map(ga => `${ga.name} (Priority: ${ga.priority || 'N/A'}, Status: ${ga.status || 'N/A'})`).join('; ')}
---

Provide your analysis in a clear, easy-to-read format. Highlight any crucial connections or alarming issues you observe across these components.`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      // FIX: Changed contents to an array of Part objects for robust input with config
      contents: [{ text: prompt }],
      config: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })
    return response.text || ''
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    throw new Error("Failed to get AI analysis. Please check your API key and network connection.")
  }
}

export async function summarizeDashboardMetrics(metrics: DashboardMetrics, timePeriod: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // FIX: Updated to access .value from DeltaMetric objects and used existing properties from types.ts
  const prompt = `
    As a business analyst, provide a concise summary of the following key performance indicators (KPIs) for a business over the ${timePeriod}.
    Your summary should be 150-200 words.
    Format your response using Markdown.

    **Key Tasks:**
    1.  Start with a headline summarizing the overall performance.
    2.  Highlight the most important positive trend (e.g., strong revenue growth).
    3.  Identify one key area for improvement or a potential risk (e.g., high cart abandonment).
    4.  Provide one actionable recommendation based on your analysis.

    **KPI Data:**
    - Total Revenue: ${metrics.totalRevenue.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
    - Total Orders: ${metrics.ordersReceived.value.toLocaleString()}
    - Total Registrations: ${metrics.registrations.value.toLocaleString()}
    - Average Order Value (AOV): ${metrics.aov.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
    - Conversion Rate: ${metrics.conversionRate.value.toFixed(1)}%
    - Cart Abandonment Rate: ${metrics.leakage.abandonmentRate.value.toFixed(1)}%
    - COD Rate: ${metrics.orderHealth.codPct.value.toFixed(1)}%

    Analyze these metrics and provide a clear, actionable summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // FIX: Changed contents to an array of Part objects for robust input with config
      contents: [{ text: prompt }],
      config: {
        // FIX: Set both maxOutputTokens and thinkingBudget at the same time for gemini models
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 250 }, 
        temperature: 0.6,
      },
    });
    return response.text || '';
  } catch (error) {
    console.error("Error calling Gemini API for dashboard summary:", error);
    throw new Error("Failed to get AI summary. Please check your API key and network connection.");
  }
}
