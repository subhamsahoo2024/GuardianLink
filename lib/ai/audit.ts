type AiOperation = "triage" | "incident_synthesis" | "translation";

export interface AiAuditEntry {
  id: string;
  operation: AiOperation;
  model: string;
  provider: "gemini" | "fallback";
  inputSize: number;
  outputSize: number;
  redactions: number;
  success: boolean;
  details: string;
  createdAt: string;
}

const aiAuditEntries: AiAuditEntry[] = [];

export function logAiDecision(
  entry: Omit<AiAuditEntry, "id" | "createdAt">,
): AiAuditEntry {
  const created = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  aiAuditEntries.unshift(created);

  // Keep recent history bounded in memory for development and demo mode.
  if (aiAuditEntries.length > 500) {
    aiAuditEntries.length = 500;
  }

  return created;
}

export function listAiAuditEntries(limit = 50): AiAuditEntry[] {
  return aiAuditEntries.slice(0, limit);
}
