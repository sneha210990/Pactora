// Parses CUAD master_clauses.csv and loads contract text files.
// Uses a built-in RFC-4180-compliant CSV parser to avoid external dependencies.

import * as fs from 'fs';
import * as path from 'path';
import type { CuadLabel } from './types';

// ---------------------------------------------------------------------------
// RFC 4180 CSV parser
// ---------------------------------------------------------------------------

function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  const n = raw.length;
  let i = 0;

  while (i < n) {
    const row: string[] = [];

    // Parse one row
    while (i < n) {
      if (raw[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = '';
        while (i < n) {
          if (raw[i] === '"' && raw[i + 1] === '"') {
            field += '"';
            i += 2;
          } else if (raw[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            field += raw[i++];
          }
        }
        row.push(field);
      } else {
        // Unquoted field – read until comma or newline
        let field = '';
        while (i < n && raw[i] !== ',' && raw[i] !== '\n' && raw[i] !== '\r') {
          field += raw[i++];
        }
        row.push(field);
      }

      if (i < n && raw[i] === ',') {
        i++; // consume comma, expect next field
      } else {
        break; // end of row
      }
    }

    // Skip CR+LF or LF
    if (i < n && raw[i] === '\r') i++;
    if (i < n && raw[i] === '\n') i++;

    if (row.length > 0) rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// CUAD CSV loader
// ---------------------------------------------------------------------------

// CUAD v1 uses "Document Name" as the contract identifier column.
// Fall back to these alternatives in order if the primary is not found.
const DOCUMENT_NAME_CANDIDATES = [
  'Document Name',
  'document_name',
  'Filename',
  'filename',
  'File Name',
  'file_name',
];

export function parseCuadCsv(csvPath: string): CuadLabel[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(raw);

  if (rows.length < 2) {
    throw new Error(`CSV at ${csvPath} has fewer than 2 rows (no data).`);
  }

  const headers = rows[0];

  // Find the document-name column
  let docNameIdx = -1;
  for (const candidate of DOCUMENT_NAME_CANDIDATES) {
    const idx = headers.findIndex(
      (h) => h.trim().toLowerCase() === candidate.toLowerCase(),
    );
    if (idx !== -1) {
      docNameIdx = idx;
      break;
    }
  }

  if (docNameIdx === -1) {
    throw new Error(
      `Could not find a document-name column in CSV. ` +
        `Headers found: ${headers.slice(0, 10).join(', ')}. ` +
        `Expected one of: ${DOCUMENT_NAME_CANDIDATES.join(', ')}.`,
    );
  }

  const labels: CuadLabel[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) continue;

    const documentName = (row[docNameIdx] ?? '').trim();
    if (!documentName) continue;

    const categories: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (c === docNameIdx) continue;
      const header = headers[c].trim();
      if (header) {
        categories[header] = (row[c] ?? '').trim();
      }
    }

    labels.push({
      contractId: sanitiseId(documentName),
      documentName,
      categories,
    });
  }

  return labels;
}

// ---------------------------------------------------------------------------
// Contract text loader
// ---------------------------------------------------------------------------

// CUAD text files may be named exactly as the document name + '.txt', or
// the document name may already contain the extension.
export function loadContractText(txtDir: string, documentName: string): string {
  const candidates = [
    path.join(txtDir, `${documentName}.txt`),
    path.join(txtDir, documentName),
    path.join(txtDir, `${documentName}.TXT`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf-8');
    }
  }

  // Try case-insensitive match within the directory
  const files = fs.readdirSync(txtDir);
  const lower = documentName.toLowerCase();
  for (const file of files) {
    if (
      file.toLowerCase() === `${lower}.txt` ||
      file.toLowerCase() === lower
    ) {
      return fs.readFileSync(path.join(txtDir, file), 'utf-8');
    }
  }

  throw new Error(
    `Contract text file not found for "${documentName}" in ${txtDir}. ` +
      `Tried: ${candidates.map((c) => path.basename(c)).join(', ')}.`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitiseId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}
