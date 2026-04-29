const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const config = require('../config');
const { loadSystemPrompt, loadSkillPrompt } = require('./prompts');
const { getAllToolDefinitions, requiresApproval, executeTool } = require('../tools/tool-handler');
const { createApproval } = require('./approval');

let anthropicClient = null;
let deepseekClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getDeepseekClient() {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      baseURL: config.DEEPSEEK_BASE_URL,
      apiKey: config.DEEPSEEK_API_KEY,
    });
  }
  return deepseekClient;
}

let conversationHistory = [];
const MAX_MESSAGES = 40;
const MAX_AGENT_TURNS = 15;
const STREAM_TIMEOUT_MS = 60 * 1000;
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

function isDeepSeek() {
  return config.PROVIDER === 'deepseek';
}

function convertHistoryToAnthropic(history) {
  return history.map(msg => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      return { role: msg.role, content: msg.content };
    }
    return { role: msg.role, content: msg.content };
  });
}

function convertHistoryToOpenAI(history) {
  return history.map(msg => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const text = msg.content.find(c => c.type === 'text')?.text || '';
      return { role: msg.role, content: text };
    }
    return { role: msg.role, content: msg.content };
  });
}

async function chatAnthropic(userMessage, skill, systemPrompt, onText, onApproval, onToolUse) {
  const anthropic = getAnthropicClient();
  const tools = getAllToolDefinitions();

  let fullMessage = userMessage;
  if (skill) {
    const skillPrompt = loadSkillPrompt(skill);
    if (skillPrompt) {
      fullMessage = `[Skill activated: /${skill}]\n\n${skillPrompt}\n\n---\n\nUser's request: ${userMessage}`;
    }
  }

  conversationHistory.push({ role: 'user', content: fullMessage });

  if (conversationHistory.length > MAX_MESSAGES) {
    const KEEP_FIRST = 4;
    conversationHistory = [
      ...conversationHistory.slice(0, KEEP_FIRST),
      ...conversationHistory.slice(-(MAX_MESSAGES - KEEP_FIRST)),
    ];
  }

  let fullResponse = '';
  let turns = 0;

  while (true) {
    turns++;
    if (turns > MAX_AGENT_TURNS) {
      onText('\n\n[Agent stopped: maximum tool iterations reached.]');
      break;
    }

    const stream = anthropic.messages.stream({
      model: config.MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: convertHistoryToAnthropic(conversationHistory),
    });

    let streamTimeoutId;
    const streamTimeout = new Promise((_, reject) => {
      streamTimeoutId = setTimeout(() => reject(new Error('Claude API call timed out after 60s')), STREAM_TIMEOUT_MS);
    });

    let assistantContent = [];
    let toolUseBlocks = [];

    const processStream = async () => {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            onText(event.delta.text);
          }
        }
      }
      return stream.finalMessage();
    };

    const finalMessage = await Promise.race([processStream(), streamTimeout]);
    clearTimeout(streamTimeoutId);

    assistantContent = finalMessage.content;
    conversationHistory.push({ role: 'assistant', content: assistantContent });

    toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      fullResponse = assistantContent.filter(block => block.type === 'text').map(b => b.text).join('');
      break;
    }

    const readBlocks = toolUseBlocks.filter(b => !requiresApproval(b.name));
    const writeBlocks = toolUseBlocks.filter(b => requiresApproval(b.name));

    const readResultPromises = readBlocks.map(async (toolBlock) => {
      try {
        onToolUse({ tool: toolBlock.name, input: toolBlock.input });
        const result = await executeTool(toolBlock.name, toolBlock.input);
        return { type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify(result) };
      } catch (err) {
        return { type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify({ error: err.message }) };
      }
    });

    const writeResultPromises = (async () => {
      const results = [];
      for (const toolBlock of writeBlocks) {
        onToolUse({ tool: toolBlock.name, input: toolBlock.input });
        const { id, promise } = createApproval(toolBlock.name, toolBlock.input, toolBlock.id);
        onApproval({ approvalId: id, toolName: toolBlock.name, toolInput: toolBlock.input });

        let approvalTimeoutId;
        const approvalTimeout = new Promise((resolve) => {
          approvalTimeoutId = setTimeout(() => resolve(false), APPROVAL_TIMEOUT_MS);
        });
        const approved = await Promise.race([promise, approvalTimeout]);
        clearTimeout(approvalTimeoutId);

        if (approved) {
          const result = await executeTool(toolBlock.name, toolBlock.input);
          results.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify(result) });
        } else {
          results.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify({ error: 'User declined this operation.' }) });
        }
      }
      return results;
    })();

    const [readResults, writeResults] = await Promise.all([Promise.all(readResultPromises), writeResultPromises]);

    const toolResultMap = new Map();
    for (const r of [...readResults, ...writeResults]) toolResultMap.set(r.tool_use_id, r);
    const toolResults = toolUseBlocks.map(b => toolResultMap.get(b.id));

    conversationHistory.push({ role: 'user', content: toolResults });

    const turnText = assistantContent.filter(b => b.type === 'text').map(b => b.text).join('');
    fullResponse += turnText;
  }

  return fullResponse;
}

async function chatDeepSeek(userMessage, skill, systemPrompt, onText) {
  const deepseek = getDeepseekClient();

  let fullMessage = userMessage;
  if (skill) {
    const skillPrompt = loadSkillPrompt(skill);
    if (skillPrompt) {
      fullMessage = `[Skill activated: /${skill}]\n\n${skillPrompt}\n\n---\n\nUser's request: ${userMessage}`;
    }
  }

  conversationHistory.push({ role: 'user', content: fullMessage });

  if (conversationHistory.length > MAX_MESSAGES) {
    const KEEP_FIRST = 4;
    conversationHistory = [
      ...conversationHistory.slice(0, KEEP_FIRST),
      ...conversationHistory.slice(-(MAX_MESSAGES - KEEP_FIRST)),
    ];
  }

  const messages = convertHistoryToOpenAI(conversationHistory);
  if (systemPrompt) {
    messages.unshift({ role: 'system', content: systemPrompt });
  }

  const stream = await deepseek.chat.completions.create({
    model: config.DEEPSEEK_MODEL,
    messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: 8192,
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) {
      onText(reasoning);
    }
    if (chunk.choices[0]?.delta?.content) {
      onText(chunk.choices[0].delta.content);
      fullResponse += chunk.choices[0].delta.content;
    }
  }

  conversationHistory.push({ role: 'assistant', content: fullResponse });
  return fullResponse;
}

async function chat(userMessage, skill, onText, onApproval, onToolUse) {
  const systemPrompt = loadSystemPrompt();

  if (isDeepSeek()) {
    return chatDeepSeek(userMessage, skill, systemPrompt, onText);
  }
  return chatAnthropic(userMessage, skill, systemPrompt, onText, onApproval, onToolUse);
}

function getHistory() {
  return conversationHistory;
}

function clearHistory() {
  conversationHistory = [];
}

function loadHistory(messages) {
  conversationHistory = messages;
}

module.exports = { chat, getHistory, clearHistory, loadHistory };