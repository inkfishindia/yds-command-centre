const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { loadSystemPrompt, loadSkillPrompt } = require('./prompts');
const { getAllToolDefinitions, requiresApproval, executeTool } = require('../tools/tool-handler');
const { createApproval } = require('./approval');

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return client;
}

// Conversation state — single user, in-memory
let conversationHistory = [];
const MAX_MESSAGES = 40; // Keep last 40 messages to manage token window
const MAX_AGENT_TURNS = 15; // Prevent infinite tool-call loops
const STREAM_TIMEOUT_MS = 60 * 1000; // 60s timeout per Claude API call
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5-minute timeout for abandoned approvals

/**
 * Process a user message and stream the agent's response.
 *
 * @param {string} userMessage - The user's message
 * @param {string|null} skill - Optional skill name to inject
 * @param {function} onText - Callback for streaming text chunks
 * @param {function} onApproval - Callback when a write tool needs approval
 * @param {function} onToolUse - Callback for tool use progress updates
 * @returns {Promise<string>} The complete assistant response
 */
async function chat(userMessage, skill, onText, onApproval, onToolUse) {
  const anthropic = getClient();
  const systemPrompt = loadSystemPrompt();
  const tools = getAllToolDefinitions();

  // If a skill is active, prepend the skill prompt to the user message
  let fullMessage = userMessage;
  if (skill) {
    const skillPrompt = loadSkillPrompt(skill);
    if (skillPrompt) {
      fullMessage = `[Skill activated: /${skill}]\n\n${skillPrompt}\n\n---\n\nUser's request: ${userMessage}`;
    }
  }

  // Add user message to history
  conversationHistory.push({ role: 'user', content: fullMessage });

  // Trim history if too long
  if (conversationHistory.length > MAX_MESSAGES) {
    conversationHistory = conversationHistory.slice(-MAX_MESSAGES);
  }

  // Agent loop — keep going until we get a final text response (no more tool calls)
  let fullResponse = '';
  let turns = 0;

  while (true) {
    turns++;
    if (turns > MAX_AGENT_TURNS) {
      onText('\n\n[Agent stopped: maximum tool iterations reached. Please try a more specific request.]');
      break;
    }

    const stream = anthropic.messages.stream({
      model: config.MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: conversationHistory,
    });

    // Race the stream against a timeout
    let streamTimeoutId;
    const streamTimeout = new Promise((_, reject) => {
      streamTimeoutId = setTimeout(() => reject(new Error('Claude API call timed out after 60s')), STREAM_TIMEOUT_MS);
    });

    let assistantContent = [];
    let currentText = '';
    let toolUseBlocks = [];

    // Collect the streamed response (with timeout)
    const processStream = async () => {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            onText(event.delta.text);
          }
        }
      }
      return stream.finalMessage();
    };

    const finalMessage = await Promise.race([processStream(), streamTimeout]);
    clearTimeout(streamTimeoutId);

    // Build the content array from the final message
    assistantContent = finalMessage.content;

    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: assistantContent });

    // Check if we have tool use blocks
    toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      // No tool calls — we're done
      fullResponse = assistantContent
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
      break;
    }

    // Process tool calls
    const toolResults = [];

    for (const toolBlock of toolUseBlocks) {
      onToolUse({ tool: toolBlock.name, input: toolBlock.input });

      if (requiresApproval(toolBlock.name)) {
        // This is a write operation — need Dan's approval
        const { id, promise } = createApproval(toolBlock.name, toolBlock.input, toolBlock.id);
        onApproval({
          approvalId: id,
          toolName: toolBlock.name,
          toolInput: toolBlock.input,
        });

        // Wait for approval (auto-reject after 5 minutes)
        const approvalTimeout = new Promise((resolve) =>
          setTimeout(() => resolve(false), APPROVAL_TIMEOUT_MS)
        );
        const approved = await Promise.race([promise, approvalTimeout]);

        if (approved) {
          const result = await executeTool(toolBlock.name, toolBlock.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify(result),
          });
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: 'User declined this operation.' }),
          });
        }
      } else {
        // Read operation — execute immediately
        const result = await executeTool(toolBlock.name, toolBlock.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Add tool results to history and continue the loop
    conversationHistory.push({ role: 'user', content: toolResults });

    // Accumulate text from this turn
    const turnText = assistantContent
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
    fullResponse += turnText;
  }

  return fullResponse;
}

/**
 * Get current conversation history (for session persistence)
 */
function getHistory() {
  return conversationHistory;
}

/**
 * Clear conversation and start fresh
 */
function clearHistory() {
  conversationHistory = [];
}

/**
 * Load conversation from saved session
 */
function loadHistory(messages) {
  conversationHistory = messages;
}

module.exports = { chat, getHistory, clearHistory, loadHistory };
