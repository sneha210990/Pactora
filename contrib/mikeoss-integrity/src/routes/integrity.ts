import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createServerSupabase } from '../lib/supabase';
import { downloadFile } from '../lib/storage';
import { runIntegrityEngine } from '../lib/integrity/engine';

// PDF text extraction — uses pdfjs-dist which is already a project dependency.
async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: { str: string }) => item.str).join(' '));
  }
  return pages.join('\n');
}

// DOCX text extraction — uses mammoth which is already a project dependency.
async function extractDocxText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value as string;
}

async function extractText(buffer: Buffer, fileType: string | null, filename: string): Promise<string | null> {
  const type = (fileType ?? '').toLowerCase();
  const name = filename.toLowerCase();
  try {
    if (type.includes('pdf') || name.endsWith('.pdf')) return await extractPdfText(buffer);
    if (
      type.includes('word') ||
      type.includes('officedocument') ||
      name.endsWith('.docx') ||
      name.endsWith('.doc')
    )
      return await extractDocxText(buffer);
    // Plain-text fallback
    return buffer.toString('utf-8');
  } catch {
    return null;
  }
}

const router = Router();

/**
 * POST /integrity/:documentId
 *
 * Runs deterministic contract integrity analysis on a stored document.
 * No AI required — all checks are rule-based. Returns an IntegrityReport.
 *
 * Supports multi-document analysis: pass additional document IDs in the
 * request body as `additionalDocumentIds: string[]` to validate cross-document
 * references (e.g. an MSA that references a Schedule uploaded separately).
 */
router.post('/:documentId', requireAuth, async (req, res) => {
  const { documentId } = req.params;
  const { userId } = res.locals as { userId: string };
  const additionalIds: string[] = Array.isArray(req.body?.additionalDocumentIds)
    ? req.body.additionalDocumentIds
    : [];

  const db = createServerSupabase(req, res);

  // Fetch metadata + storage path for the primary document and any extras.
  const allIds = [documentId, ...additionalIds];
  const { data: docs, error } = await db
    .from('documents')
    .select(
      `
      id,
      filename,
      file_type,
      user_id,
      project_id,
      document_versions!current_version_id (
        storage_path
      )
    `,
    )
    .in('id', allIds);

  if (error || !docs || docs.length === 0) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Verify the requesting user owns or has project-level access to each doc.
  for (const doc of docs) {
    if (doc.user_id !== userId) {
      // Check project membership as a fallback (mirrors ensureDocAccess pattern).
      const { data: member } = await db
        .from('projects')
        .select('id')
        .eq('id', doc.project_id)
        .eq('user_id', userId)
        .maybeSingle();
      if (!member) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }
  }

  // Download and extract text for each document.
  const inputs: { id: string; title: string; text: string }[] = [];

  for (const doc of docs) {
    const versions = doc.document_versions as Array<{ storage_path: string }> | null;
    const storagePath = versions?.[0]?.storage_path;
    if (!storagePath) {
      return res.status(422).json({ error: `No stored version found for document ${doc.id}.` });
    }

    const arrayBuffer = await downloadFile(storagePath);
    if (!arrayBuffer) {
      return res.status(422).json({ error: `Could not retrieve content for document ${doc.id}.` });
    }

    const text = await extractText(Buffer.from(arrayBuffer), doc.file_type, doc.filename);
    if (!text || text.trim().length < 50) {
      return res.status(422).json({
        error: `Could not extract readable text from "${doc.filename}". Ensure the file is a text-based PDF or DOCX.`,
      });
    }

    inputs.push({ id: doc.id, title: doc.filename, text });
  }

  const report = runIntegrityEngine(inputs);
  return res.json(report);
});

export default router;
