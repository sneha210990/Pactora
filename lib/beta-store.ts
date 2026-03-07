import { promises as fs } from 'fs';
import path from 'path';

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
  | 'analysis_started'
  | 'analysis_completed'
  | 'feedback_submitted'
  | 'logout';

export type BetaEvent = {
  id: string;
  event_type: BetaEventType;
  user_id: string | null;
  email: string | null;
  page_context: string;
  created_at: string;
};

type BetaStore = {
  users: BetaUser[];
  sessions: BetaSession[];
  feedback: FeedbackEntry[];
  events: BetaEvent[];
};

const dataDir = path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'beta-store.json');

const defaultStore: BetaStore = {
  users: [],
  sessions: [],
  feedback: [],
  events: [],
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
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: BetaStore) {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8');
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
