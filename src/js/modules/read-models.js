export function unwrapReadModelResponse(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
    return {
      data: payload.data,
      meta: payload.meta,
    };
  }

  return {
    data: payload,
    meta: null,
  };
}

export function formatReadModelFreshness(meta) {
  const generatedAt = meta?.generatedAt;
  if (!generatedAt) return '';

  const diff = Math.max(0, Math.round((Date.now() - new Date(generatedAt).getTime()) / 1000));
  if (diff < 60) return `Data generated ${diff}s ago`;
  if (diff < 3600) return `Data generated ${Math.round(diff / 60)}m ago`;
  return `Data generated ${Math.round(diff / 3600)}h ago`;
}

export function getReadModelTone(meta) {
  if (!meta) return 'neutral';
  if (meta.stale) return 'critical';
  if (meta.partial) return 'warning';
  return 'healthy';
}

export function getReadModelSummary(meta, healthyLabel = 'All primary sources loaded') {
  if (!meta) return '';
  if (meta.stale && meta.fallbackReason) {
    return `Fallback data in use: ${meta.fallbackReason}`;
  }
  if (meta.partial && Array.isArray(meta.degradedSources) && meta.degradedSources.length) {
    return `Partial data: ${meta.degradedSources.join(', ')}`;
  }
  return healthyLabel;
}
