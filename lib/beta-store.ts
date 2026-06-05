import { promises as fs } from 'fs';
import path from 'path';
import { isSupabaseDbConfigured, dbInsertAuditEvent, dbQueryAuditEvents } from './supabase-db';

export type BetaUser = {
  id: string;
  email: string;
  auth_provider?: string;
  auth_user_id?: string;
  full_name?: string;
  company?: string;
  role?: string;
  use_case?: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  first_upload_at: string | null;
  first_feedback_at: string | null;
};

export type BetaSession = {
  token: string;
  user_id: string;
  created_at: string;
  last_active_at: string;
};

export type FeedbackCategory = 'bug' | 'confusing' | 'missing_feature' | 'general_feedback';

export type FeedbackEntry = {
  id: string;
  user_id: string | null;
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_context: string;
  request_call: boolean;
  can_contact: boolean;
  created_at: string;
};

export type BetaEventType =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'profile_completed'
  | 'contract_upload_started'
  | 'contract_uploaded'
  | 'manual_clause_entry_started'
  | 'manual_clause_entry_submitted'
  | 'analysis_started'
  | 'analysis_completed'
  | 'feedback_submitted'
  | 'email_captured'
  | 'logout';

export type BetaEvent = {
  id: string;
  event_type: BetaEventType;
  user_id: string | null;
  email: string | null;
  page_context: string;
  created_at: string;
};

export type ApiUsageRecord = {
  id: string;
  created_at: string;
  operation: 'extraction' | 'clause_analysis';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
};

export type AuditAction = 'contract_extracted' | 'clause_analysed' | 'redline_generated';

export type AuditEvent = {
  id: string;
  user_id: string | null;
  action: AuditAction;
  document_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type BetaStore = {
  users: BetaUser[];
  sessions: BetaSession[];
  feedback: FeedbackEntry[];
  events: BetaEvent[];
  apiUsage: ApiUsageRecord[];
  auditEvents: AuditEvent[];
};

// Vercel's project root is read-only; /tmp is the only writable path in serverless.
const dataDir = process.env.VERCEL
  ? path.join('/tmp', 'pactora-data')
  : path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'beta-store.json');

const defaultStore: BetaStore = {
  users: [],
  sessions: [],
  feedback: [],
  events: [],
  apiUsage: [],
  auditEvents: [],
};

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

async function readStore(): Promise<BetaStore> {
  await ensureDataFile();

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BetaStore>;

    return {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      feedback: parsed.feedback ?? [],
      events: parsed.events ?? [],
      apiUsage: parsed.apiUsage ?? [],
      auditEvents: parsed.auditEvents ?? [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: BetaStore) {
  await ensureDataFile();
  const serialized = JSON.stringify(store, null, 2);
  if (serialized.length > 5 * 1024 * 1024) {
    console.error('[beta-store] store size limit exceeded — write rejected');
    return;
  }
  await fs.writeFile(dataFile, serialized, 'utf8');
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function getUserBySessionToken(token: string) {
  const store = await readStore();
  const session = store.sessions.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  const user = store.users.find((entry) => entry.id === session.user_id);

  if (!user) {
    return null;
  }

  return { user, session };
}


export async function createOrUpdateUserByIdentity(params: {
  provider: string;
  auth_user_id: string;
  email: string;
}) {
  const now = new Date().toISOString();
  const store = await readStore();
  const normalizedEmail = params.email.trim().toLowerCase();

  const byIdentity = store.users.find(
    (user) => user.auth_provider === params.provider && user.auth_user_id === params.auth_user_id,
  );

  if (byIdentity) {
    byIdentity.email = normalizedEmail;
    byIdentity.updated_at = now;
    byIdentity.last_active_at = now;
    await writeStore(store);
    return byIdentity;
  }

  const byEmail = store.users.find((user) => user.email === normalizedEmail);

  if (byEmail) {
    byEmail.auth_provider = params.provider;
    byEmail.auth_user_id = params.auth_user_id;
    byEmail.updated_at = now;
    byEmail.last_active_at = now;
    await writeStore(store);
    return byEmail;
  }

  const user: BetaUser = {
    id: id('usr'),
    email: normalizedEmail,
    auth_provider: params.provider,
    auth_user_id: params.auth_user_id,
    created_at: now,
    updated_at: now,
    last_active_at: now,
    first_upload_at: null,
    first_feedback_at: null,
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}
export async function createOrUpdateUser(params: {
  email: string;
  full_name?: string;
  company?: string;
  role?: string;
  use_case?: string;
}) {
  const now = new Date().toISOString();
  const store = await readStore();
  const normalizedEmail = params.email.trim().toLowerCase();
  const existing = store.users.find((user) => user.email === normalizedEmail);

  if (existing) {
    existing.full_name = params.full_name?.trim() || existing.full_name;
    existing.company = params.company?.trim() || existing.company;
    existing.role = params.role?.trim() || existing.role;
    existing.use_case = params.use_case?.trim() || existing.use_case;
    existing.updated_at = now;
    existing.last_active_at = now;
    await writeStore(store);
    return { user: existing, created: false };
  }

  const user: BetaUser = {
    id: id('usr'),
    email: normalizedEmail,
    full_name: params.full_name?.trim() || undefined,
    company: params.company?.trim() || undefined,
    role: params.role?.trim() || undefined,
    use_case: params.use_case?.trim() || undefined,
    created_at: now,
    updated_at: now,
    last_active_at: now,
    first_upload_at: null,
    first_feedback_at: null,
  };

  store.users.push(user);
  await writeStore(store);
  return { user, created: true };
}

export async function createSession(userId: string) {
  const now = new Date().toISOString();
  const store = await readStore();

  const session: BetaSession = {
    token: id('sess'),
    user_id: userId,
    created_at: now,
    last_active_at: now,
  };

  store.sessions = store.sessions.filter((entry) => entry.user_id !== userId);
  store.sessions.push(session);

  const user = store.users.find((entry) => entry.id === userId);
  if (user) {
    user.last_active_at = now;
    user.updated_at = now;
  }

  await writeStore(store);
  return session;
}

export async function deleteSession(token: string) {
  const store = await readStore();
  store.sessions = store.sessions.filter((entry) => entry.token !== token);
  await writeStore(store);
}

export async function touchUserLastActive(userId: string) {
  const now = new Date().toISOString();
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (user) {
    user.last_active_at = now;
    user.updated_at = now;
    await writeStore(store);
  }
}

export async function createFeedback(params: {
  user_id: string | null;
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_context: string;
  request_call: boolean;
  can_contact: boolean;
}) {
  const now = new Date().toISOString();
  const store = await readStore();

  const feedback: FeedbackEntry = {
    id: id('fbk'),
    ...params,
    created_at: now,
  };

  store.feedback.push(feedback);

  if (params.user_id) {
    const user = store.users.find((entry) => entry.id === params.user_id);
    if (user && !user.first_feedback_at) {
      user.first_feedback_at = now;
    }
    if (user) {
      user.last_active_at = now;
      user.updated_at = now;
    }
  }

  await writeStore(store);
  return feedback;
}

export async function createEvent(params: {
  event_type: BetaEventType;
  user_id: string | null;
  email: string | null;
  page_context: string;
}) {
  const now = new Date().toISOString();
  const store = await readStore();

  const event: BetaEvent = {
    id: id('evt'),
    ...params,
    created_at: now,
  };

  store.events.push(event);

  if (params.user_id) {
    const user = store.users.find((entry) => entry.id === params.user_id);
    if (user) {
      user.last_active_at = now;
      user.updated_at = now;

      if (params.event_type === 'contract_uploaded' && !user.first_upload_at) {
        user.first_upload_at = now;
      }
    }
  }

  await writeStore(store);
  return event;
}

export async function recordApiUsage(params: {
  operation: ApiUsageRecord['operation'];
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
}) {
  const now = new Date().toISOString();
  const store = await readStore();
  store.apiUsage.push({ id: id('api'), created_at: now, ...params });
  await writeStore(store);
}

export async function getApiUsageSummary() {
  const store = await readStore();
  const records = store.apiUsage ?? [];

  const totalCostUsd = records.reduce((s, r) => s + r.cost_usd, 0);
  const totalInputTokens = records.reduce((s, r) => s + r.input_tokens, 0);
  const totalOutputTokens = records.reduce((s, r) => s + r.output_tokens, 0);
  const totalCacheReadTokens = records.reduce((s, r) => s + r.cache_read_tokens, 0);

  const extractionRecords = records.filter((r) => r.operation === 'extraction');
  const analysisRecords = records.filter((r) => r.operation === 'clause_analysis');
  const extractionCostUsd = extractionRecords.reduce((s, r) => s + r.cost_usd, 0);
  const analysisCostUsd = analysisRecords.reduce((s, r) => s + r.cost_usd, 0);

  const contractsProcessed = extractionRecords.length;
  const avgCostPerContractUsd = contractsProcessed > 0 ? totalCostUsd / contractsProcessed : 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last30DaysCostUsd = records
    .filter((r) => r.created_at >= thirtyDaysAgo)
    .reduce((s, r) => s + r.cost_usd, 0);

  return {
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    extractionCostUsd,
    analysisCostUsd,
    contractsProcessed,
    avgCostPerContractUsd,
    last30DaysCostUsd,
    recordCount: records.length,
  };
}

export async function recordAuditEvent(params: {
  user_id: string | null;
  action: AuditAction;
  document_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // Write to Supabase when configured; always mirror to file store as fallback.
  if (isSupabaseDbConfigured()) {
    await dbInsertAuditEvent(params).catch(() => {/* non-fatal */});
  }

  const now = new Date().toISOString();
  const store = await readStore();
  const event: AuditEvent = {
    id: id('aud'),
    user_id: params.user_id,
    action: params.action,
    document_id: params.document_id ?? null,
    metadata: params.metadata ?? {},
    created_at: now,
  };
  store.auditEvents = [event, ...(store.auditEvents ?? [])].slice(0, 500);
  await writeStore(store);
}

export async function getAuditEvents(limit = 100): Promise<AuditEvent[]> {
  if (isSupabaseDbConfigured()) {
    const rows = await dbQueryAuditEvents({ limit });
    if (rows !== null) return rows;
  }
  const store = await readStore();
  return (store.auditEvents ?? []).slice(0, limit);
}

export async function getAuditEventsForUser(userId: string, limit = 100): Promise<AuditEvent[]> {
  if (isSupabaseDbConfigured()) {
    const rows = await dbQueryAuditEvents({ userId, limit });
    if (rows !== null) return rows;
  }
  // File-based fallback: filter in memory.
  const store = await readStore();
  return (store.auditEvents ?? []).filter((e) => e.user_id === userId).slice(0, limit);
}

export async function getOperatorSummary() {
  const store = await readStore();

  const feedbackCountByUser = new Map<string, number>();
  for (const entry of store.feedback) {
    if (entry.user_id) {
      feedbackCountByUser.set(entry.user_id, (feedbackCountByUser.get(entry.user_id) ?? 0) + 1);
    }
  }

  const users = store.users
    .map((user) => ({
      ...user,
      feedback_count: feedbackCountByUser.get(user.id) ?? 0,
      has_uploaded_contract: Boolean(user.first_upload_at),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    users,
    totals: {
      users: store.users.length,
      feedback: store.feedback.length,
      events: store.events.length,
      uploads: store.users.filter((user) => Boolean(user.first_upload_at)).length,
    },
  };
}
