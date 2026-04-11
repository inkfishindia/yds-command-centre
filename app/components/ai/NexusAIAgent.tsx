import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Chat, Part } from '@google/genai';
import { Card, Button, Input, EmptyState, Modal, Select } from '../../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import { useAITools } from '../../contexts/AIToolsContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { TaskPriority, ChatMessage, ProgramStatus, ProjectStatus, StrategicInitiativeStatus, StrategicObjectiveStatus, GoalStatus, QuarterlyInitiativeStatus, ResourceAllocationStatus } from '../../types';
import { createEvent as createCalendarEvent } from '../../services/calendarService';
import { searchGmailMessages } from '../../services/gmailService';
import { parseGmailMessages } from '../../services/gmailParser';
import { searchDriveFiles, getDriveFileContent } from '../../services/driveService';
import { parseDriveFiles } from '../../services/driveParser';
import ChatMessageComponent from './ChatMessage';
import { calculateMetrics } from '../../lib/metrics';

const AI_PERSONALITY_KEY = 'ai_assistant_personality';

const personalities = {
  concise: {
    label: 'Concise Assistant',
    systemInstruction: 'You are a direct and concise assistant. Get straight to the point. Keep your answers short and actionable.',
  },
  creative: {
    label: 'Creative Partner',
    systemInstruction: 'You are a creative and collaborative partner. Brainstorm ideas and provide expansive, detailed, and imaginative answers.',
  },
  coach: {
    label: 'Supportive Coach',
    systemInstruction: 'You are a supportive and encouraging coach. Help me stay organized and motivated. Frame your responses positively and offer encouragement.',
  },
};

type Personality = keyof typeof personalities;

// --- Function Declarations for Gemini ---
// The 'tools' config must be an array of tool objects.
const tools = [{
  functionDeclarations: [
    {
      name: 'create_calendar_event',
      description: 'Creates a new event on the user\'s primary Google Calendar.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: 'The title or summary of the event.' },
          start_time: { type: Type.STRING, description: 'The start time of the event in ISO 8601 format (e.g., 2024-09-27T10:00:00-07:00).' },
          end_time: { type: Type.STRING, description: 'The end time of the event in ISO 8601 format (e.g., 2024-09-27T11:00:00-07:00).' },
          location: { type: Type.STRING, description: 'The location of the event.' },
        },
        required: ['summary', 'start_time', 'end_time'],
      },
    },
    {
      name: 'get_daily_schedule',
      description: 'Fetches the user\'s upcoming Google Calendar events for today.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
    {
      name: 'get_priority_tasks',
      description: 'Fetches a list of high-priority tasks from the user\'s portfolio.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          count: { type: Type.NUMBER, description: 'The number of tasks to retrieve. Defaults to 5.' },
        },
      },
    },
    {
      name: 'search_gmail',
      description: 'Searches the user\'s Gmail for messages matching a query.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The search query, following Gmail search syntax (e.g., "from:someone@example.com subject:report").' },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_drive',
      description: 'Searches the user\'s Google Drive for files matching a query.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The search query (e.g., "name contains \'report\' and mimeType=\'application/pdf\'").' },
        },
        required: ['query'],
      },
    },
    {
        name: 'read_drive_file_content',
        description: 'Reads the text content of a file from Google Drive. Only works for text-based files like documents, not images or videos.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                file_id: { type: Type.STRING, description: 'The ID of the Google Drive file.' },
            },
            required: ['file_id'],
        },
    },
    {
      name: 'generate_content_ideas',
      description: 'Generates marketing content or campaign ideas for a given product or service.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          product_description: { type: Type.STRING, description: 'A brief description of the product or service to generate ideas for.' },
        },
        required: ['product_description'],
      },
    },
    // NEWLY ADDED FUNCTIONS
    {
      name: 'create_task',
      description: 'Creates a new task in a specific project.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          project_id: { type: Type.STRING, description: 'The ID of the project this task belongs to (e.g., "PRJ-101").' },
          task_name: { type: Type.STRING, description: 'The name of the task.' },
          priority: { type: Type.STRING, description: 'The priority of the task. Can be "Urgent", "High", "Medium", or "Low".' },
          due_date: { type: Type.STRING, description: 'The due date in YYYY-MM-DD format.' },
        },
        required: ['project_id', 'task_name'],
      },
    },
    {
      name: 'find_project_by_name',
      description: 'Finds a project by its name and returns its details.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          project_name: { type: Type.STRING, description: 'The name of the project to search for.' },
        },
        required: ['project_name'],
      },
    },
    {
      name: 'get_program_status',
      description: 'Gets the status, progress, and key details of a specific program.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          program_name: { type: Type.STRING, description: 'The name of the program to get the status for.' },
        },
        required: ['program_name'],
      },
    },
    {
      name: 'get_customer_segment_details',
      description: 'Retrieves detailed information about a specific customer segment from the Business Model Canvas.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          segment_name: { type: Type.STRING, description: 'The name of the customer segment.' },
        },
        required: ['segment_name'],
      },
    },
    {
      name: 'find_team_member',
      description: 'Finds a team member by name and returns their role, hub, and responsibilities.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          full_name: { type: Type.STRING, description: 'The full name of the team member.' },
        },
        required: ['full_name'],
      },
    },
    {
      name: 'get_current_dashboard_metrics',
      description: 'Retrieves the latest key performance indicators (KPIs) from the main dashboard for the currently selected time filter.',
      parameters: { type: Type.OBJECT, properties: {} },
    },
  ],
}];


const NexusAIAgent: React.FC = () => {
  const { isSignedIn, isMockMode, signIn } = useAuth();
  const { addToast } = useToast();
  const { tasks: allTasks, projects, programs, team, customerSegments, saveItem } = usePortfolio();
  const { events: allEvents, loadEvents } = useGoogleCalendar();
  const { generateCampaignIdeas } = useAITools();
  const { reportData, timeFilter } = useDashboard();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [personality, setPersonality] = useState<Personality>(() => {
    return (localStorage.getItem(AI_PERSONALITY_KEY) as Personality) || 'concise';
  });

  // Initialize Chat Session
  useEffect(() => {
    if (isSignedIn || isMockMode) {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        console.warn('[NexusAI] No Gemini API key — AI chat disabled');
        setMessages([{ role: 'model', parts: [{ text: 'AI chat is unavailable — no Gemini API key configured. Set GEMINI_API_KEY in .env.local to enable.' }] }]);
        return;
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const chatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: personalities[personality].systemInstruction,
            tools: tools,
          },
        });
        setChat(chatSession);
        setMessages([{ role: 'model', parts: [{ text: `Hello! I'm your Nexus AI agent, running in ${isMockMode ? 'Demo Mode' : 'Live Mode'}. How can I help you today?` }] }]);
      } catch (err) {
        console.error('[NexusAI] Failed to initialize:', err);
        setMessages([{ role: 'model', parts: [{ text: 'AI chat failed to initialize. Check your Gemini API key.' }] }]);
      }
    }
  }, [isSignedIn, isMockMode, personality]);
  
  // Scroll to bottom of chat
  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const text = userInput;
    setUserInput('');
  
    // Add user message to chat history immediately
    const userMessage: ChatMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
        // Changed 'contents' to 'message' as per @google/genai Chat API guidelines.
        let response = await chat.sendMessage({ message: text }); 

        while(response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;

            setMessages(prev => [...prev, { role: 'model', parts: [{ functionCall: functionCalls[0] }] }]);

            const functionResponses: Part[] = [];

            for (const call of functionCalls) {
                let result: any = { error: `Function ${call.name} not found.` };
                try {
                    switch (call.name) {
                        // Existing Functions
                        case 'create_calendar_event':
                            // Cast arguments to their expected types.
                            result = await createCalendarEvent({
                                summary: call.args.summary as string,
                                start: { dateTime: call.args.start_time as string },
                                end: { dateTime: call.args.end_time as string },
                                location: call.args.location as string,
                            });
                            await loadEvents(true);
                            break;
                        case 'get_daily_schedule':
                            result = allEvents;
                            break;
                        case 'get_priority_tasks':
                            // Add defensive check for 'count' argument.
                            let count = 5; // Default value
                            if (call.args.count !== undefined && call.args.count !== null) {
                                if (typeof call.args.count === 'number') {
                                    count = call.args.count;
                                } else if (typeof call.args.count === 'string') {
                                    const parsed = parseFloat(call.args.count);
                                    if (!isNaN(parsed)) count = parsed;
                                } else {
                                    console.warn(`Unexpected type for 'count' argument in get_priority_tasks:`, call.args.count);
                                }
                            }
                            result = allTasks.filter(t => t.priority === TaskPriority.HIGH || t.priority === TaskPriority.URGENT).slice(0, count);
                            break;
                        case 'search_gmail':
                            // Cast 'query' argument to string.
                            const rawMessages = await searchGmailMessages(call.args.query as string);
                            result = parseGmailMessages(rawMessages).map(m => ({ from: m.sender, subject: m.subject, snippet: m.snippet }));
                            break;
                        case 'search_drive':
                            // Cast 'query' argument to string.
                            const rawFiles = await searchDriveFiles(call.args.query as string);
                            result = parseDriveFiles(rawFiles).map(f => ({ name: f.name, type: f.mimeType, link: f.webViewLink }));
                            break;
                        case 'read_drive_file_content':
                            // Cast 'file_id' argument to string.
                            result = await getDriveFileContent(call.args.file_id as string);
                            break;
                        case 'generate_content_ideas':
                            // Cast 'product_description' argument to string.
                            const ideas = await generateCampaignIdeas(call.args.product_description as string);
                            result = ideas?.map(idea => ({ name: idea.name, description: idea.description, channels: idea.channels.join(', ') }));
                            break;
                        // NEW Functions
                        case 'create_task':
                            // Cast arguments to their expected types.
                            await saveItem('task', {
                                projectId: call.args.project_id as string,
                                taskName: call.args.task_name as string,
                                priority: call.args.priority as TaskPriority,
                                dueDate: call.args.due_date as string,
                            }, call.args.project_id as string);
                            result = { success: true, taskName: call.args.task_name };
                            break;
                        case 'find_project_by_name':
                            // Cast argument to string before calling toLowerCase.
                            const foundProject = projects.find(p => p.projectName.toLowerCase().includes((call.args.project_name as string).toLowerCase()));
                            result = foundProject || { info: "Project not found." };
                            break;
                        case 'get_program_status':
                            // Cast argument to string before calling toLowerCase.
                            const foundProgram = programs.find(p => p.programName.toLowerCase().includes((call.args.program_name as string).toLowerCase()));
                            result = foundProgram ? { name: foundProgram.programName, status: foundProgram.status, health: foundProgram.healthStatus, progress: `${foundProgram.timelineProgressPct}%` } : { info: "Program not found." };
                            break;
                        case 'get_customer_segment_details':
                            // Cast argument to string before calling toLowerCase.
                            const segment = customerSegments.find(s => s.name.toLowerCase() === (call.args.segment_name as string).toLowerCase());
                            result = segment ? { name: segment.name, profile: segment.customerProfile, jobsToBeDone: segment.jobsToBeDone, promise: segment.promiseStatement } : { info: "Customer segment not found." };
                            break;
                        case 'find_team_member':
                            // Cast argument to string before calling toLowerCase.
                            const member = team.find(t => t.fullName.toLowerCase().includes((call.args.full_name as string).toLowerCase()));
                            result = member ? { name: member.fullName, role: member.role, hub: member.primaryHubName, responsibility: member.keyResponsibility } : { info: "Team member not found." };
                            break;
                        case 'get_current_dashboard_metrics':
                            const now = new Date();
                            const days = timeFilter === 'all' ? Infinity : parseInt(timeFilter, 10);
                            const filteredData = reportData.filter(d => {
                                if (!d.date) return false;
                                const diffTime = now.getTime() - d.date.getTime();
                                return (diffTime / (1000 * 3600 * 24)) <= days;
                            });
                            result = calculateMetrics(filteredData);
                            break;
                    }
                } catch (e: any) {
                    result = { error: e.message };
                    addToast(`Tool Error (${call.name}): ${e.message}`, 'error');
                }
                // Strictly follow guideline for function response structure
                functionResponses.push({ functionResponse: { name: call.name, response: { result: result } } });
            }
            
            // Changed 'contents' to 'message' as per @google/genai Chat API guidelines.
            response = await chat.sendMessage({ message: functionResponses }); 
        }
        
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: response.text }] }]);

    } catch (err: any) {
        console.error("AI Assistant Error:", err);
        // Ensure 'parts' is an empty array when an 'error' is present to satisfy ChatMessageComponent's rendering.
        setMessages(prev => [...prev, { role: 'model', error: `Sorry, something went wrong: ${err.message}`, parts: [] }]);
        addToast(err.message, 'error');
    } finally {
        setIsLoading(false);
    }
  }, [chat, isLoading, addToast, allEvents, allTasks, projects, programs, customerSegments, team, loadEvents, generateCampaignIdeas, saveItem, userInput, reportData, timeFilter]);
  
  const handlePersonalityChange = (value: string) => {
    const newPersonality = value as Personality;
    setPersonality(newPersonality);
    localStorage.setItem(AI_PERSONALITY_KEY, newPersonality);
    setIsSettingsModalOpen(false);
    addToast(`AI personality changed to ${personalities[newPersonality].label}`, 'info');
  };

  if (!isSignedIn && !isMockMode) {
      return (
        <Card>
            <EmptyState
                title="Please sign in to use the AI Assistant"
                description="Connect your Google account to interact with your data."
                action={<Button variant="accent" onClick={signIn}>Sign in with Google 🚀</Button>}
            />
        </Card>
      )
  }

  return (
    <div className="h-full flex flex-col">
      <Card 
        className="flex-1 flex col min-h-[50vh]" 
        bodyClassName="flex-1 flex flex-col overflow-hidden"
        title="Nexus AI Agent"
        headerAction={<Button variant="secondary" size="sm" onClick={() => setIsSettingsModalOpen(true)}>Settings ⚙️</Button>}
      >
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-4 -mr-4">
          {messages.map((msg, i) => (
            <ChatMessageComponent key={i} message={msg} />
          ))}
          {isLoading && (
              <div className="flex items-start gap-3 my-4 flex-row">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-bg-surface)] text-xl shrink-0">🤖</div>
                <div className="max-w-xl rounded-lg px-4 py-2 bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] self-start animate-pulse">
                    Thinking...
                </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-primary)] pt-4">
          <Input
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Ask Nexus AI anything..."
            className="flex-1"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <Button type="submit" disabled={isLoading || !userInput.trim()}>Send</Button>
        </form>
      </Card>

      <Modal open={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="AI Assistant Settings">
        <div className="space-y-4">
          <Select
            label="AI Personality"
            options={Object.entries(personalities).map(([key, { label }]) => ({ value: key, label }))}
            value={personality}
            onChange={handlePersonalityChange}
          />
          <p className="text-sm text-[var(--color-text-secondary)]">Changing the personality will start a new chat session.</p>
        </div>
      </Modal>
    </div>
  );
};

export default NexusAIAgent;