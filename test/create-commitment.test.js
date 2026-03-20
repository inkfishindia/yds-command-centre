const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Notion Service — createCommitment and createDecision exports', () => {
  let notionService;

  it('loads the notion service without crashing', () => {
    notionService = require('../server/services/notion');
    assert.ok(notionService);
  });

  it('exports createCommitment as a function', () => {
    assert.equal(typeof notionService.createCommitment, 'function');
  });

  it('exports createDecision as a function', () => {
    assert.equal(typeof notionService.createDecision, 'function');
  });
});

describe('Decisions Route', () => {
  let decisionsRouter;

  it('loads the decisions route module without crashing', () => {
    decisionsRouter = require('../server/routes/decisions');
    assert.ok(decisionsRouter);
  });

  it('exports an express router', () => {
    // Express routers are functions with a .stack array
    assert.ok(typeof decisionsRouter === 'function' || Array.isArray(decisionsRouter.stack));
  });

  it('has a POST / handler registered', () => {
    const postRoutes = decisionsRouter.stack.filter(
      layer => layer.route && layer.route.methods.post && layer.route.path === '/'
    );
    assert.equal(postRoutes.length, 1);
  });
});

describe('Commitments Route — POST / handler', () => {
  let commitmentsRouter;

  it('loads the commitments route module without crashing', () => {
    commitmentsRouter = require('../server/routes/commitments');
    assert.ok(commitmentsRouter);
  });

  it('has a POST / handler registered', () => {
    const postRoutes = commitmentsRouter.stack.filter(
      layer => layer.route && layer.route.methods.post && layer.route.path === '/'
    );
    assert.equal(postRoutes.length, 1);
  });
});

describe('Commitments POST — validation logic', () => {
  // Test validation inline by simulating req/res without a real server
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  // Grab the POST handler from the router stack
  let postHandler;
  it('finds the POST handler', () => {
    const router = require('../server/routes/commitments');
    const layer = router.stack.find(
      l => l.route && l.route.methods.post && l.route.path === '/'
    );
    postHandler = layer.route.stack[0].handle;
    assert.ok(typeof postHandler === 'function');
  });

  it('rejects missing name with 400', async () => {
    const req = { body: { assigneeId: 'abc123', dueDate: '2026-04-01', focusAreaId: 'fa1' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Name'));
  });

  it('rejects missing assigneeId with 400', async () => {
    const req = { body: { name: 'Test', dueDate: '2026-04-01', focusAreaId: 'fa1' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Assignee'));
  });

  it('rejects invalid dueDate format with 400', async () => {
    const req = { body: { name: 'Test', assigneeId: 'abc123', dueDate: 'not-a-date', focusAreaId: 'fa1' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('due date'));
  });

  it('rejects missing focusAreaId with 400', async () => {
    const req = { body: { name: 'Test', assigneeId: 'abc123', dueDate: '2026-04-01' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Focus area'));
  });

  it('rejects AI expert assignee with 400', async () => {
    const req = { body: {
      name: 'Test',
      assigneeId: '308247aa0d7b8185b2c1d2b738aee402', // Colin (AI Expert)
      dueDate: '2026-04-01',
      focusAreaId: 'fa1',
    }};
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('AI expert'));
  });

  it('rejects invalid priority with 400', async () => {
    const req = { body: {
      name: 'Test',
      assigneeId: '307247aa0d7b81318999e80042f45d6a', // Dan (real human)
      dueDate: '2026-04-01',
      focusAreaId: 'fa1',
      priority: 'ASAP',
    }};
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('priority'));
  });
});

describe('Decisions POST — validation logic', () => {
  function makeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  let postHandler;
  it('finds the POST handler', () => {
    const router = require('../server/routes/decisions');
    const layer = router.stack.find(
      l => l.route && l.route.methods.post && l.route.path === '/'
    );
    postHandler = layer.route.stack[0].handle;
    assert.ok(typeof postHandler === 'function');
  });

  it('rejects missing name with 400', async () => {
    const req = { body: { decision: 'We decided to go ahead.' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Name'));
  });

  it('rejects missing decision text with 400', async () => {
    const req = { body: { name: 'Launch date decision' } };
    const res = makeRes();
    await postHandler(req, res);
    assert.equal(res._status, 400);
    assert.ok(res._body.error.includes('Decision'));
  });
});
