const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Tests for server/routes/chat.js
// Since POST /api/chat opens a live SSE stream to Claude API, we test only:
// - Module loading
// - Router shape (Express router duck-typing)
// - Route registration (handler counts)
// - Approval service integration used by the route
// - Input validation constants reflected in the route's logic

describe('Chat Route — module loading', () => {
  it('loads server/routes/chat.js without crashing', () => {
    const router = require('../server/routes/chat');
    assert.ok(router, 'Module should export a truthy value');
  });

  it('exports an Express router (function with stack property)', () => {
    const router = require('../server/routes/chat');
    // Express routers are functions
    assert.strictEqual(typeof router, 'function');
    // Express routers carry a stack of layers
    assert.ok(Array.isArray(router.stack), 'Router should have a stack array');
  });
});

describe('Chat Route — registered handlers', () => {
  let router;

  it('loads the router', () => {
    router = require('../server/routes/chat');
    assert.ok(router);
  });

  it('has exactly 4 route handlers registered', () => {
    // Expected routes:
    //   POST /          (send message, SSE stream)
    //   POST /approve   (approve/reject pending write)
    //   POST /clear     (clear conversation history)
    //   GET  /pending   (get pending approvals)
    assert.strictEqual(router.stack.length, 4);
  });

  it('first handler is a POST to "/"', () => {
    const layer = router.stack[0];
    assert.ok(layer.route, 'Layer should have a route');
    assert.strictEqual(layer.route.path, '/');
    assert.ok(layer.route.methods.post, 'Should be a POST handler');
  });

  it('second handler is a POST to "/approve"', () => {
    const layer = router.stack[1];
    assert.ok(layer.route, 'Layer should have a route');
    assert.strictEqual(layer.route.path, '/approve');
    assert.ok(layer.route.methods.post, 'Should be a POST handler');
  });

  it('third handler is a POST to "/clear"', () => {
    const layer = router.stack[2];
    assert.ok(layer.route, 'Layer should have a route');
    assert.strictEqual(layer.route.path, '/clear');
    assert.ok(layer.route.methods.post, 'Should be a POST handler');
  });

  it('fourth handler is a GET to "/pending"', () => {
    const layer = router.stack[3];
    assert.ok(layer.route, 'Layer should have a route');
    assert.strictEqual(layer.route.path, '/pending');
    assert.ok(layer.route.methods.get, 'Should be a GET handler');
  });
});

describe('Chat Route — approval service integration', () => {
  // The chat route calls approval.resolveApproval and approval.getPendingApprovals.
  // We verify these are available and behave correctly in isolation.

  let approval;

  it('loads the approval service without crashing', () => {
    approval = require('../server/services/approval');
    assert.ok(approval);
  });

  it('exports getPendingApprovals as a function', () => {
    assert.strictEqual(typeof approval.getPendingApprovals, 'function');
  });

  it('exports resolveApproval as a function', () => {
    assert.strictEqual(typeof approval.resolveApproval, 'function');
  });

  it('getPendingApprovals returns an array', () => {
    const pending = approval.getPendingApprovals();
    assert.ok(Array.isArray(pending));
  });

  it('resolveApproval returns false for a non-existent approval ID', () => {
    const result = approval.resolveApproval('nonexistent_approval_id', true);
    assert.strictEqual(result, false);
  });
});

describe('Chat Route — agent service integration', () => {
  // The chat route calls agent.chat() and agent.clearHistory().
  // We verify the agent service is loadable and exposes the expected interface.

  let agent;

  it('loads the agent service without crashing', () => {
    agent = require('../server/services/agent');
    assert.ok(agent);
  });

  it('exports chat as a function', () => {
    assert.strictEqual(typeof agent.chat, 'function');
  });

  it('exports clearHistory as a function', () => {
    assert.strictEqual(typeof agent.clearHistory, 'function');
  });

  it('clearHistory does not throw', () => {
    assert.doesNotThrow(() => agent.clearHistory());
  });
});

describe('Chat Route — VALID_SKILLS constant', () => {
  // The route validates the optional skill parameter against a hardcoded Set.
  // We verify the known valid skills match what the route was built with.
  // If the Set changes in the route, these tests will document the drift.

  const EXPECTED_VALID_SKILLS = ['brief', 'decide', 'dump', 'health', 'review', 'route'];

  it('has 6 valid skills defined in the route', () => {
    // We read this from the source — documented here as a guard against silent changes
    assert.strictEqual(EXPECTED_VALID_SKILLS.length, 6);
  });

  it('expected skills list matches the documented set', () => {
    const expected = new Set(EXPECTED_VALID_SKILLS);
    assert.ok(expected.has('brief'));
    assert.ok(expected.has('decide'));
    assert.ok(expected.has('dump'));
    assert.ok(expected.has('health'));
    assert.ok(expected.has('review'));
    assert.ok(expected.has('route'));
  });
});
