import { GoogleGenAI, Modality, Type, GenerateContentResponse, Operation, GenerateVideosResponse } from '@google/genai';
import { getEnv } from '../lib/env';
import {
  BrandProfile, CustomerPsychologyOutput, ContentStrategyOutput, CampaignIdea, BlogPostOutput,
  GeneratedImage, GeneratedVideo, CampaignChannel, // FIX: Imported CampaignChannel
} from '../types';

// Utility for Base64 encoding/decoding for audio/images
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to convert Blob to Base64 string
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove "data:image/jpeg;base64," prefix
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to convert blob to base64 string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Initializes GoogleGenAI client.
 * NOTE: For Veo, a new instance is created *just before* the API call
 * to ensure the latest selected API key is used, as per guidelines.
 * For other models, we can keep it as a singleton.
 */
let ai: GoogleGenAI | null = null;
const getGenAIClient = () => {
  if (!ai) {
    const API_KEY = getEnv('API_KEY'); // Assume API_KEY is available via process.env or window.__RUNTIME_CONFIG__
    if (!API_KEY) {
      throw new Error("API Key is not configured. Please ensure process.env.API_KEY is set.");
    }
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

// --- Text Generative Models (gemini-2.5-flash) ---

const TEXT_GENERATION_MODEL = 'gemini-2.5-flash';

/**
 * Generates a customer psychology profile based on brand and marketing goal.
 */
export async function generateCustomerPsychology(
  brand: BrandProfile,
  marketingGoal: string,
): Promise<CustomerPsychologyOutput> {
  const aiClient = getGenAIClient();
  const prompt = `Analyze the customer psychology for a brand with the following profile, focusing on achieving the given marketing goal.
  
  **Brand Profile:**
  - Name: ${brand.name}
  - Voice: ${brand.voice}
  - Mission: ${brand.mission}
  - Target Audience: ${brand.targetAudience || 'Not specified'}
  - Key Messages: ${brand.keyMessages || 'Not specified'}
  
  **Marketing Goal:** ${marketingGoal}
  
  **Generate a detailed customer persona, including:**
  1.  **Persona Summary:** Demographics, psychographics, pain points, motivations.
  2.  **Customer Journey Map:** Stages from awareness to retention.
  3.  **Behavioral Triggers:** Internal and external factors influencing action.
  4.  **Conversion Psychology:** Principles to leverage for the marketing goal (e.g., scarcity, social proof, reciprocity).
  
  Format the response clearly with headings for each section.`;

  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: TEXT_GENERATION_MODEL,
    // FIX: Changed contents to an array of Part objects
    contents: [{ text: prompt }],
    config: {
      temperature: 0.8,
      maxOutputTokens: 1500,
      // FIX: Added thinkingBudget for gemini-2.5-flash model
      thinkingConfig: { thinkingBudget: 400 },
    },
  });

  // FIX: Updated to directly use .text property
  const fullText = response.text;
  // Simple parsing for output sections. A more robust solution might use JSON schema.
  const personaSummaryMatch = fullText.match(/Persona Summary:\s*([\s\S]*?)\n\n/i);
  const customerJourneyMatch = fullText.match(/Customer Journey Map:\s*([\s\S]*?)\n\n/i);
  const behavioralTriggersMatch = fullText.match(/Behavioral Triggers:\s*([\s\S]*?)\n\n/i);
  const conversionPsychologyMatch = fullText.match(/Conversion Psychology:\s*([\s\S]*)/i);

  return {
    brandId: brand.id,
    marketingGoal,
    personaSummary: personaSummaryMatch ? personaSummaryMatch[1].trim() : 'N/A',
    customerJourneyMap: customerJourneyMatch ? customerJourneyMatch[1].trim() : 'N/A',
    behavioralTriggers: behavioralTriggersMatch ? behavioralTriggersMatch[1].trim() : 'N/A',
    conversionPsychology: conversionPsychologyMatch ? conversionPsychologyMatch[1].trim() : 'N/A',
    rawOutput: fullText,
  };
}

/**
 * Searches for recent social media activity of a competitor using Google Search grounding.
 * @param competitorName The name of the competitor.
 * @returns A promise that resolves to the summarized social media activity (Markdown).
 */
export async function searchCompetitorSocialMedia(competitorName: string): Promise<string> {
  const aiClient = getGenAIClient();
  const prompt = `Summarize recent (last 2 weeks) social media activity (Twitter/X, LinkedIn) for "${competitorName}". Include links to specific posts if possible. If no recent activity is found, state that.`;

  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: TEXT_GENERATION_MODEL,
    // FIX: Changed contents to an array of Part objects
    contents: [{ text: prompt }],
    config: {
      tools: [{ googleSearch: {} }], // Use Google Search grounding
      temperature: 0.3, // Lower temperature for factual searches
      maxOutputTokens: 1000,
      // FIX: Added thinkingBudget for gemini-2.5-flash model
      thinkingConfig: { thinkingBudget: 250 },
    },
  });

  // FIX: Updated to directly use .text property
  let result = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

  // Append URLs from grounding chunks
  if (groundingChunks && groundingChunks.length > 0) {
    const urls = new Set<string>();
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        urls.add(`- [${chunk.web.title || 'Link'}](${chunk.web.uri})`);
      }
    });
    if (urls.size > 0) {
      result += '\n\n**Sources:**\n' + Array.from(urls).join('\n');
    }
  }

  return result;
}

/**
 * Generates a comprehensive content strategy.
 */
export async function generateContentStrategy(
  campaignBrief: string,
  targetAudience: string,
): Promise<ContentStrategyOutput> {
  const aiClient = getGenAIClient();
  const prompt = `Develop a comprehensive content strategy based on the following campaign brief and target audience.

  **Campaign Brief:** ${campaignBrief}
  **Target Audience Description:** ${targetAudience}

  **The content strategy should include:**
  1.  **Social Posting Ideas:** 3-5 specific post ideas for key platforms.
  2.  **Editorial Calendar Themes:** 2-3 overarching themes for a multi-month period.
  3.  **Multi-channel Strategy:** How content will be adapted for different channels (e.g., blog, email, video, social).
  4.  **Core Brand Storytelling Angles:** Key narratives or messages to convey.

  Format the response clearly with headings for each section.`;

  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: TEXT_GENERATION_MODEL,
    // FIX: Changed contents to an array of Part objects
    contents: [{ text: prompt }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      // FIX: Added thinkingBudget for gemini-2.5-flash model
      thinkingConfig: { thinkingBudget: 300 },
    },
  });

  // FIX: Updated to directly use .text property
  const fullText = response.text;
  const socialIdeasMatch = fullText.match(/Social Posting Ideas:\s*([\s\S]*?)\n\n/i);
  const editorialThemesMatch = fullText.match(/Editorial Calendar Themes:\s*([\s\S]*?)\n\n/i);
  const multiChannelMatch = fullText.match(/Multi-channel Strategy:\s*([\s\S]*?)\n\n/i);
  const storytellingMatch = fullText.match(/Core Brand Storytelling Angles:\s*([\s\S]*)/i);

  const parseList = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split('\n').map(item => item.replace(/^- /, '').trim()).filter(Boolean);
  };

  return {
    campaignBrief,
    targetAudienceDescription: targetAudience,
    socialPostingIdeas: parseList(socialIdeasMatch ? socialIdeasMatch[1] : undefined),
    editorialCalendarThemes: parseList(editorialThemesMatch ? editorialThemesMatch[1] : undefined),
    multiChannelStrategy: multiChannelMatch ? multiChannelMatch[1].trim() : 'N/A',
    coreBrandStorytelling: storytellingMatch ? storytellingMatch[1].trim() : 'N/A',
    rawOutput: fullText,
  };
}

/**
 * Brainstorms innovative marketing campaign ideas.
 */
export async function generateCampaignIdeas(productServiceDescription: string): Promise<CampaignIdea[]> {
  const aiClient = getGenAIClient();
  const prompt = `Generate 3-5 innovative marketing campaign ideas for the following product/service. For each idea, provide:
  -   A catchy **Campaign Name**.
  -   A concise **Description** of the campaign.
  -   Suggested **Execution Channels** (e.g., Social Media, Email, Paid Ads, Events).
  
  Format the output as a JSON array of objects, each with 'name', 'description', and 'channels' (array of strings).`;

  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: TEXT_GENERATION_MODEL,
    // FIX: Changed contents to an array of Part objects
    contents: [{ text: prompt }],
    config: {
      temperature: 0.9, // Higher temperature for creativity
      maxOutputTokens: 1000,
      // FIX: Added thinkingBudget for gemini-2.5-flash model
      thinkingConfig: { thinkingBudget: 250 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            channels: {
              type: Type.ARRAY,
              items: { type: Type.STRING }, // Will map to CampaignChannel enum later if needed
            },
          },
          required: ['name', 'description', 'channels'],
        },
      },
    },
  });

  // FIX: Updated to directly use .text property
  const jsonStr = response.text.trim();
  try {
    const parsedIdeas: Array<{ name: string; description: string; channels: string[] }> = JSON.parse(jsonStr);
    return parsedIdeas.map((idea, index) => ({
      id: `CAMPAIGN-${Date.now()}-${index}`,
      name: idea.name,
      description: idea.description,
      channels: idea.channels.filter((c): c is CampaignChannel => Object.values(CampaignChannel).includes(c as CampaignChannel)),
      productService: productServiceDescription,
      rawOutput: JSON.stringify(idea, null, 2),
    }));
  } catch (e) {
    console.error('Failed to parse campaign ideas JSON:', e);
    throw new Error('Failed to parse AI response for campaign ideas. Please try again.');
  }
}

/**
 * Drafts an engaging blog post on a specified topic.
 */
export async function generateBlogPost(topic: string): Promise<BlogPostOutput> {
  const aiClient = getGenAIClient();
  const prompt = `Write an engaging and informative blog post on the topic: "${topic}".
  The blog post should include:
  1.  A compelling **Title**.
  2.  The **Content** of the blog post (approx. 500-700 words), formatted using Markdown (headings, bold, lists).
  3.  An SEO-friendly **Meta Description** (max 160 characters).
  
  Focus on clear, concise language suitable for a general audience.`;

  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: TEXT_GENERATION_MODEL,
    // FIX: Changed contents to an array of Part objects
    contents: [{ text: prompt }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      // FIX: Added thinkingBudget for gemini-2.5-flash model
      thinkingConfig: { thinkingBudget: 500 },
    },
  });

  // FIX: Updated to directly use .text property
  const fullText = response.text;
  const titleMatch = fullText.match(/Title:\s*([\s\S]*?)\n\n/i);
  const contentMatch = fullText.match(/Content:\s*([\s\S]*?)\n\nMeta Description:/i);
  const metaDescriptionMatch = fullText.match(/Meta Description:\s*([\s\S]*)/i);

  return {
    topic,
    title: titleMatch ? titleMatch[1].trim() : 'Untitled Blog Post',
    content: contentMatch ? contentMatch[1].trim() : 'No content generated.',
    metaDescription: metaDescriptionMatch ? metaDescriptionMatch[1].trim().substring(0, 160) : '',
    rawOutput: fullText,
  };
}

// --- Image Generative Models ---

const IMAGE_GENERATION_MODEL = 'imagen-4.0-generate-001';
const IMAGE_EDITING_MODEL = 'gemini-2.5-flash-image';

/**
 * Generates an image from a text prompt.
 */
export async function generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<GeneratedImage> {
  const aiClient = getGenAIClient();
  const response = await aiClient.models.generateImages({
    model: IMAGE_GENERATION_MODEL,
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9', // Type assertion
    },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

  return {
    id: `IMG-${Date.now()}`,
    prompt,
    imageUrl,
    mimeType: 'image/jpeg',
    aspectRatio,
    rawOutput: response,
  };
}

/**
 * Edits an existing image based on a text prompt.
 * @param sourceImageBase64 The base64 encoded string of the source image.
 * @param sourceMimeType The MIME type of the source image.
 * @param prompt The text prompt describing the edit.
 */
export async function editImage(
  sourceImageBase64: string,
  sourceMimeType: string,
  prompt: string,
): Promise<GeneratedImage> {
  const aiClient = getGenAIClient();
  const response: GenerateContentResponse = await aiClient.models.generateContent({
    model: IMAGE_EDITING_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: sourceImageBase64,
            mimeType: sourceMimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  // Extract the generated image from the response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!imagePart?.inlineData?.data || !imagePart?.inlineData?.mimeType) {
    throw new Error("No edited image found in AI response.");
  }

  const base64ImageBytes: string = imagePart.inlineData.data;
  const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;

  return {
    id: `IMG-EDIT-${Date.now()}`,
    prompt,
    imageUrl,
    mimeType: imagePart.inlineData.mimeType,
    sourceImageId: 'uploaded-source-image', // Placeholder ID for traceability
    rawOutput: response,
  };
}

// --- Video Generative Models ---

const VIDEO_GENERATION_MODEL = 'veo-3.1-fast-generate-preview'; // Updated to 3.1 as per guidelines

/**
 * Generates a video from a text prompt and an optional starting image.
 * Includes specific API key selection and polling logic.
 */
export async function generateVideo(
  prompt: string,
  startImageFile?: File, // File object for image upload
  resolution: '720p' | '1080p' = '720p',
  aspectRatio: '16:9' | '9:16' = '16:9',
): Promise<GeneratedVideo> {
  // CRITICAL: Re-initialize GoogleGenAI right before the API call for Veo
  // to ensure it uses the most up-to-date API key selected by the user.
  const API_KEY = getEnv('API_KEY');
  if (!API_KEY) {
    throw new Error("API Key is not configured for Video Generation. Please select an API Key.");
  }
  const aiClient = new GoogleGenAI({ apiKey: API_KEY });

  let imagePart: { imageBytes: string; mimeType: string } | undefined;
  if (startImageFile) {
    const base64Data = await blobToBase64(startImageFile);
    imagePart = { imageBytes: base64Data, mimeType: startImageFile.type };
  }

  // Determine payload
  const payload: any = {
    model: VIDEO_GENERATION_MODEL,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution,
      aspectRatio,
    },
  };
  if (imagePart) {
    payload.image = imagePart;
  }

  // FIX: Provide the correct generic type for Operation
  let operation: Operation<GenerateVideosResponse> = await aiClient.models.generateVideos(payload);

  // Poll for completion
  const POLLING_INTERVAL_MS = 5000;
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    operation = await aiClient.operations.getVideosOperation({ operation: operation });
  }

  // Handle potential errors from the operation
  if (operation.error) {
    const errorMessage = operation.error.message || "Unknown error during video generation.";
    // Fix: The type of `errorMessage` could be unknown. Coerce to string before using `includes`.
    if (String(errorMessage).includes("Requested entity was not found.")) {
      // Specific error handling for API key issues
      throw new Error("Video API Key invalid or expired. Please select your API Key again via the 'Select API Key' button.");
    }
    throw new Error(`Video generation failed: ${errorMessage}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("No video URI found in the response.");
  }

  // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
  const videoUrlWithKey = `${downloadLink}&key=${API_KEY}`;

  return {
    id: `VID-${Date.now()}`,
    prompt,
    videoUrl: videoUrlWithKey,
    resolution,
    aspectRatio,
    sourceImageId: imagePart ? `uploaded-image-${Date.now()}` : undefined,
    rawOutput: operation,
  };
}