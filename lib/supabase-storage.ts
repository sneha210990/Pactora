// Supabase Storage client for DOCX originals.
// All calls use the service-role key and operate server-side only.
// When the key is absent (local dev without Storage configured) every
// function returns null/false so callers fall back to sessionStorage.

const BUCKET = 'deal-originals';

function storageUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function isStorageConfigured(): boolean {
  return !!(storageUrl() && serviceKey());
}

async function storageFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const url = storageUrl();
  const key = serviceKey();
  if (!url || !key) return null;

  try {
    return await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('[supabase-storage] fetch error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function uploadDocx(buffer: Buffer, storageKey: string): Promise<boolean> {
  const res = await storageFetch(storageKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'x-upsert': 'true',
    },
    body: new Uint8Array(buffer) as unknown as BodyInit,
  });

  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => '') : 'no response';
    console.warn('[supabase-storage] upload failed:', res?.status, detail);
    return false;
  }

  return true;
}

export async function downloadDocx(storageKey: string): Promise<Buffer | null> {
  const res = await storageFetch(storageKey, { method: 'GET' });

  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => '') : 'no response';
    console.warn('[supabase-storage] download failed:', res?.status, detail);
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
