/**
 * Approval gate for write operations.
 * When the agent wants to write to Notion or files, the request is held here
 * until Dan approves or rejects it through the frontend.
 */

const pendingApprovals = new Map();

function createApproval(toolName, toolInput, toolUseId) {
  const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const approval = {
    id,
    toolName,
    toolInput,
    toolUseId,
    createdAt: new Date().toISOString(),
    status: 'pending', // pending | approved | rejected
    resolve: null, // Will be set to a promise resolver
  };

  const promise = new Promise((resolve) => {
    approval.resolve = resolve;
  });

  pendingApprovals.set(id, approval);
  return { id, promise };
}

function resolveApproval(approvalId, approved) {
  const approval = pendingApprovals.get(approvalId);
  if (!approval) return false;

  approval.status = approved ? 'approved' : 'rejected';
  approval.resolve(approved);
  pendingApprovals.delete(approvalId);
  return true;
}

function getPendingApprovals() {
  return Array.from(pendingApprovals.values()).map(a => ({
    id: a.id,
    toolName: a.toolName,
    toolInput: a.toolInput,
    createdAt: a.createdAt,
  }));
}

module.exports = { createApproval, resolveApproval, getPendingApprovals };
