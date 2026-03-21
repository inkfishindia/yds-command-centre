/**
 * Tests for server/services/agent.js
 *
 * Strategy: we inject a mock Anthropic SDK into require.cache before loading
 * the agent module so no real API calls are made. Each describe block that
 * needs a fresh agent state deletes the cached module and reloads it.
 *
 * Mocks needed:
 *   @anthropic-ai/sdk          — returns fake streamed messages
 *   server/services/prompts    — returns dummy system prompt
 *   server/tools/tool-handler  — stubbed getAllToolDefinitions / requiresApproval / executeTool
 *   server/services/approval   — stubbed createApproval
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// ── Path helpers ──────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const AGENT_PATH = path.join(ROOT, 'server', 'services', 'agent.js');
const PROMPTS_PATH = path.join(ROOT, 'server', 'services', 'prompts.js');
const TOOL_HANDLER_PATH = path.join(ROOT, 'server', 'tools', 'tool-handler.js');
const APPROVAL_PATH = path.join(ROOT, 'server', 'services', 'approval.js');
const SDK_PATH = require.resolve('@anthropic-ai/sdk');

// ── Mock factory helpers ──────────────────────────────────────────────────────

/**
 * Build a minimal fake Anthropic SDK class.
 * messageFactory(callCount) should return a fake finalMessage object:
 *   { content: [...], stop_reason: 'end_turn'|'tool_use' }
 */
function buildFakeSDK(messageFactory) {
  let callCount = 0;
  class FakeMessages {
    stream() {
      const msg = messageFactory(callCount++);
      // Return an async-iterable that yields content_block_delta events for
      // any text blocks, then resolves via finalMessage().
      const textBlocks = msg.content.filter(b => b.type === 'text');
      const events = textBlocks.map(b => ({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: b.text },
      }));
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            async next() {
              if (i < events.length) return { value: events[i++], done: false };
              return { value: undefined, done: true };
            },
          };
        },
        finalMessage: async () => msg,
      };
    }
  }
  class FakeAnthropic {
    constructor() { this.messages = new FakeMessages(); }
  }
  return FakeAnthropic;
}

/** Inject mocks into require.cache, then load a fresh copy of agent.js. */
function loadFreshAgent({ messageFactory, approvalFactory, executeToolStub, requiresApprovalStub, promptsStub }) {
  // 1. Remove cached agent so it re-evaluates
  delete require.cache[AGENT_PATH];

  // 2. Stub @anthropic-ai/sdk — always set, whether cached or not
  const FakeAnthropic = buildFakeSDK(messageFactory);
  if (!require.cache[SDK_PATH]) {
    // Create a minimal cache entry so require() returns our fake
    require.cache[SDK_PATH] = {
      id: SDK_PATH,
      filename: SDK_PATH,
      loaded: true,
      exports: FakeAnthropic,
      parent: null,
      children: [],
      paths: [],
    };
  } else {
    require.cache[SDK_PATH].exports = FakeAnthropic;
  }

  // 3. Stub prompts (caller may provide a custom stub)
  delete require.cache[PROMPTS_PATH];
  require.cache[PROMPTS_PATH] = {
    id: PROMPTS_PATH,
    filename: PROMPTS_PATH,
    loaded: true,
    exports: promptsStub || {
      loadSystemPrompt: () => 'You are a test assistant.',
      loadSkillPrompt: () => null,
    },
    parent: null,
    children: [],
    paths: [],
  };

  // 4. Stub tool-handler
  delete require.cache[TOOL_HANDLER_PATH];
  require.cache[TOOL_HANDLER_PATH] = {
    id: TOOL_HANDLER_PATH,
    filename: TOOL_HANDLER_PATH,
    loaded: true,
    exports: {
      getAllToolDefinitions: () => [],
      requiresApproval: requiresApprovalStub || (() => false),
      executeTool: executeToolStub || (async () => ({ ok: true })),
    },
    parent: null,
    children: [],
    paths: [],
  };

  // 5. Stub approval service (unless we want the real one)
  if (approvalFactory) {
    delete require.cache[APPROVAL_PATH];
    require.cache[APPROVAL_PATH] = {
      id: APPROVAL_PATH,
      filename: APPROVAL_PATH,
      loaded: true,
      exports: approvalFactory,
      parent: null,
      children: [],
      paths: [],
    };
  }

  // 6. Load fresh agent
  return require(AGENT_PATH);
}

/** Restore stubs so later test suites get real modules. */
function restoreModules() {
  delete require.cache[AGENT_PATH];
  delete require.cache[PROMPTS_PATH];
  delete require.cache[TOOL_HANDLER_PATH];
  delete require.cache[APPROVAL_PATH];
  // Delete the SDK entry so next require reloads it fresh from disk (the real one).
  delete require.cache[SDK_PATH];
}

// ── History helpers (no mock needed) ─────────────────────────────────────────

describe('Agent — history helpers', () => {
  let agent;

  beforeEach(() => {
    delete require.cache[AGENT_PATH];
    // We need prompts + tool-handler to load cleanly even here
    delete require.cache[PROMPTS_PATH];
    require.cache[PROMPTS_PATH] = {
      id: PROMPTS_PATH, filename: PROMPTS_PATH, loaded: true,
      exports: { loadSystemPrompt: () => '', loadSkillPrompt: () => null },
      parent: null, children: [], paths: [],
    };
    delete require.cache[TOOL_HANDLER_PATH];
    require.cache[TOOL_HANDLER_PATH] = {
      id: TOOL_HANDLER_PATH, filename: TOOL_HANDLER_PATH, loaded: true,
      exports: { getAllToolDefinitions: () => [], requiresApproval: () => false, executeTool: async () => ({}) },
      parent: null, children: [], paths: [],
    };
    agent = require(AGENT_PATH);
  });

  afterEach(() => {
    restoreModules();
  });

  it('exports chat, getHistory, clearHistory, loadHistory', () => {
    assert.equal(typeof agent.chat, 'function');
    assert.equal(typeof agent.getHistory, 'function');
    assert.equal(typeof agent.clearHistory, 'function');
    assert.equal(typeof agent.loadHistory, 'function');
  });

  it('getHistory returns empty array on fresh load', () => {
    const h = agent.getHistory();
    assert.ok(Array.isArray(h));
    assert.equal(h.length, 0);
  });

  it('loadHistory sets conversation history', () => {
    const msgs = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];
    agent.loadHistory(msgs);
    assert.deepEqual(agent.getHistory(), msgs);
  });

  it('clearHistory resets conversation history to empty', () => {
    agent.loadHistory([{ role: 'user', content: 'something' }]);
    agent.clearHistory();
    assert.equal(agent.getHistory().length, 0);
  });
});

// ── Basic chat — text response, end_turn ──────────────────────────────────────

describe('Agent — basic text response (end_turn)', () => {
  let agent;

  beforeEach(() => {
    agent = loadFreshAgent({
      messageFactory: () => ({
        content: [{ type: 'text', text: 'Hello from Claude!' }],
        stop_reason: 'end_turn',
      }),
    });
    agent.clearHistory();
  });

  afterEach(restoreModules);

  it('returns the text from the assistant response', async () => {
    const collected = [];
    const result = await agent.chat(
      'Say hello',
      null,
      (chunk) => collected.push(chunk),
      () => {},
      () => {},
    );
    assert.equal(result, 'Hello from Claude!');
  });

  it('calls onText callback with streamed text chunks', async () => {
    const chunks = [];
    await agent.chat('Hi', null, (chunk) => chunks.push(chunk), () => {}, () => {});
    assert.equal(chunks.join(''), 'Hello from Claude!');
  });

  it('adds user message to conversation history', async () => {
    await agent.chat('Test message', null, () => {}, () => {}, () => {});
    const history = agent.getHistory();
    assert.ok(history.some(m => m.role === 'user' && m.content === 'Test message'));
  });

  it('adds assistant response to conversation history', async () => {
    await agent.chat('Test', null, () => {}, () => {}, () => {});
    const history = agent.getHistory();
    assert.ok(history.some(m => m.role === 'assistant'));
  });

  it('skill prompt is prepended to user message when skill is active', async () => {
    // Reload agent with a prompts stub that returns a non-null skill prompt
    agent = loadFreshAgent({
      messageFactory: () => ({
        content: [{ type: 'text', text: 'Brief done.' }],
        stop_reason: 'end_turn',
      }),
      promptsStub: {
        loadSystemPrompt: () => 'System',
        loadSkillPrompt: (skill) => skill === 'brief' ? 'Run morning brief.' : null,
      },
    });
    agent.clearHistory();

    await agent.chat('Go', 'brief', () => {}, () => {}, () => {});
    const history = agent.getHistory();
    const userMsg = history.find(m => m.role === 'user');
    assert.ok(userMsg.content.includes('Run morning brief.'), 'Skill prompt should be in user message');
    assert.ok(userMsg.content.includes('Go'), 'Original message should be preserved');
  });
});

// ── Tool use cycle ────────────────────────────────────────────────────────────

describe('Agent — tool use cycle', () => {
  let agent;
  let executeToolCalls;

  beforeEach(() => {
    executeToolCalls = [];
    let turn = 0;

    agent = loadFreshAgent({
      messageFactory: () => {
        turn++;
        if (turn === 1) {
          // First call: Claude uses a read tool
          return {
            content: [
              { type: 'tool_use', id: 'tool_1', name: 'read_file', input: { file_path: '/tmp/test.txt' } },
            ],
            stop_reason: 'tool_use',
          };
        }
        // Second call: Claude returns final answer
        return {
          content: [{ type: 'text', text: 'File read successfully.' }],
          stop_reason: 'end_turn',
        };
      },
      requiresApprovalStub: () => false,
      executeToolStub: async (toolName, toolInput) => {
        executeToolCalls.push({ toolName, toolInput });
        return { content: 'file contents here' };
      },
    });
    agent.clearHistory();
  });

  afterEach(restoreModules);

  it('executes the tool when Claude calls a read tool', async () => {
    await agent.chat('Read a file', null, () => {}, () => {}, () => {});
    assert.equal(executeToolCalls.length, 1);
    assert.equal(executeToolCalls[0].toolName, 'read_file');
  });

  it('returns final text after tool cycle completes', async () => {
    const result = await agent.chat('Read a file', null, () => {}, () => {}, () => {});
    assert.equal(result, 'File read successfully.');
  });

  it('adds tool result to conversation history', async () => {
    await agent.chat('Read a file', null, () => {}, () => {}, () => {});
    const history = agent.getHistory();
    // Tool result is sent as a user message
    const toolResultMsg = history.find(
      m => m.role === 'user' && Array.isArray(m.content) &&
        m.content.some(b => b.type === 'tool_result'),
    );
    assert.ok(toolResultMsg, 'Tool result message should be in history');
  });

  it('calls onToolUse callback with tool name', async () => {
    const toolEvents = [];
    await agent.chat('Read a file', null, () => {}, () => {}, (e) => toolEvents.push(e));
    assert.equal(toolEvents.length, 1);
    assert.equal(toolEvents[0].tool, 'read_file');
  });
});

// ── Approval gate ─────────────────────────────────────────────────────────────

describe('Agent — approval gate', () => {
  afterEach(restoreModules);

  it('calls onApproval callback and continues after approval resolves', async () => {
    let approvalResolve;
    const fakeApproval = {
      createApproval: (toolName, toolInput, toolUseId) => {
        const promise = new Promise((resolve) => { approvalResolve = resolve; });
        return { id: 'approval_test_1', promise };
      },
    };

    const executeToolCalls = [];
    let turn = 0;
    const agent = loadFreshAgent({
      messageFactory: () => {
        turn++;
        if (turn === 1) {
          return {
            content: [
              { type: 'tool_use', id: 'tool_w1', name: 'write_file', input: { file_path: '/tmp/out.txt', content: 'hi' } },
            ],
            stop_reason: 'tool_use',
          };
        }
        return {
          content: [{ type: 'text', text: 'Write complete.' }],
          stop_reason: 'end_turn',
        };
      },
      requiresApprovalStub: (name) => name === 'write_file',
      executeToolStub: async (toolName, toolInput) => {
        executeToolCalls.push(toolName);
        return { ok: true };
      },
      approvalFactory: fakeApproval,
    });
    agent.clearHistory();

    const approvalEvents = [];
    const chatPromise = agent.chat(
      'Write a file',
      null,
      () => {},
      (e) => approvalEvents.push(e),
      () => {},
    );

    // Let the event loop tick so the agent reaches the approval await
    await new Promise((r) => setImmediate(r));
    assert.equal(approvalEvents.length, 1, 'onApproval should have been called');
    assert.equal(approvalEvents[0].toolName, 'write_file');

    // Approve it
    approvalResolve(true);
    const result = await chatPromise;

    assert.equal(result, 'Write complete.');
    assert.deepEqual(executeToolCalls, ['write_file']);
  });

  it('does not execute write tool when approval is rejected', async () => {
    let approvalResolve;
    const fakeApproval = {
      createApproval: () => {
        const promise = new Promise((resolve) => { approvalResolve = resolve; });
        return { id: 'approval_test_2', promise };
      },
    };

    const executeToolCalls = [];
    let turn = 0;
    const agent = loadFreshAgent({
      messageFactory: () => {
        turn++;
        if (turn === 1) {
          return {
            content: [
              { type: 'tool_use', id: 'tool_w2', name: 'write_file', input: {} },
            ],
            stop_reason: 'tool_use',
          };
        }
        return {
          content: [{ type: 'text', text: 'Rejected result.' }],
          stop_reason: 'end_turn',
        };
      },
      requiresApprovalStub: () => true,
      executeToolStub: async (toolName) => { executeToolCalls.push(toolName); return {}; },
      approvalFactory: fakeApproval,
    });
    agent.clearHistory();

    const chatPromise = agent.chat('Write', null, () => {}, () => {}, () => {});
    await new Promise((r) => setImmediate(r));
    approvalResolve(false);
    await chatPromise;

    assert.equal(executeToolCalls.length, 0, 'Tool should not be executed when rejected');
  });
});

// ── Max iterations guard ──────────────────────────────────────────────────────

describe('Agent — max iterations guard', () => {
  afterEach(restoreModules);

  it('stops the loop after MAX_AGENT_TURNS and emits a stop message via onText', async () => {
    // Always return a tool_use response to force infinite looping
    let turnCount = 0;
    const agent = loadFreshAgent({
      messageFactory: () => {
        turnCount++;
        return {
          content: [
            { type: 'tool_use', id: `tool_${turnCount}`, name: 'read_file', input: {} },
          ],
          stop_reason: 'tool_use',
        };
      },
      requiresApprovalStub: () => false,
      executeToolStub: async () => ({ data: 'ok' }),
    });
    agent.clearHistory();

    const textChunks = [];
    await agent.chat('Loop forever', null, (chunk) => textChunks.push(chunk), () => {}, () => {});

    const allText = textChunks.join('');
    assert.ok(
      allText.includes('maximum tool iterations'),
      `Expected max-iterations message, got: "${allText}"`,
    );
    // MAX_AGENT_TURNS is 15 — we should stop at or before that
    assert.ok(turnCount <= 16, `Expected at most 16 turns, got ${turnCount}`);
  });
});

// ── SSE events emitted ────────────────────────────────────────────────────────

describe('Agent — SSE event callbacks', () => {
  afterEach(restoreModules);

  it('emits text via onText for each streamed text chunk', async () => {
    const agent = loadFreshAgent({
      messageFactory: () => ({
        content: [{ type: 'text', text: 'chunk one' }],
        stop_reason: 'end_turn',
      }),
    });
    agent.clearHistory();

    const textEvents = [];
    await agent.chat('Hi', null, (t) => textEvents.push(t), () => {}, () => {});
    assert.ok(textEvents.length > 0, 'onText should be called at least once');
    assert.equal(textEvents.join(''), 'chunk one');
  });

  it('emits tool_use event via onToolUse before executing tool', async () => {
    let turn = 0;
    const agent = loadFreshAgent({
      messageFactory: () => {
        turn++;
        if (turn === 1) {
          return {
            content: [{ type: 'tool_use', id: 'tu1', name: 'notion_query_database', input: { database_id: 'abc' } }],
            stop_reason: 'tool_use',
          };
        }
        return { content: [{ type: 'text', text: 'Done.' }], stop_reason: 'end_turn' };
      },
      requiresApprovalStub: () => false,
      executeToolStub: async () => ({ results: [] }),
    });
    agent.clearHistory();

    const toolEvents = [];
    await agent.chat('Query notion', null, () => {}, () => {}, (e) => toolEvents.push(e));
    assert.equal(toolEvents.length, 1);
    assert.equal(toolEvents[0].tool, 'notion_query_database');
  });

  it('does not call onText when Claude only uses tools (no text blocks)', async () => {
    let turn = 0;
    const agent = loadFreshAgent({
      messageFactory: () => {
        turn++;
        if (turn === 1) {
          return {
            content: [{ type: 'tool_use', id: 'tu2', name: 'read_file', input: {} }],
            stop_reason: 'tool_use',
          };
        }
        return { content: [{ type: 'text', text: 'Result.' }], stop_reason: 'end_turn' };
      },
      requiresApprovalStub: () => false,
      executeToolStub: async () => ({}),
    });
    agent.clearHistory();

    const textEvents = [];
    await agent.chat('Read', null, (t) => textEvents.push(t), () => {}, () => {});
    // First turn has no text block — only the second turn emits text
    assert.equal(textEvents.join(''), 'Result.');
  });
});
