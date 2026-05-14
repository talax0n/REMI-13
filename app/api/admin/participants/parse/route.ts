export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import ExcelJS from 'exceljs';
import { ParticipantImportRow } from '@/app/admin/types';

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function rowsFromValues(values: unknown[][]): ParticipantImportRow[] {
  const [headerRow, ...bodyRows] = values;
  if (!headerRow) return [];

  const headers = headerRow.map(normalizeHeader);
  const nameIndex = headers.indexOf('name');
  const teamIndex = headers.indexOf('team');
  const legacyChurchIndex = headers.indexOf('church');
  const groupingIndex = teamIndex !== -1 ? teamIndex : legacyChurchIndex;

  if (nameIndex === -1 || groupingIndex === -1) {
    throw new Error('File must have "name" and "team" columns');
  }

  return bodyRows
    .map((row) => ({
      name: String(row[nameIndex] ?? '').trim(),
      team: String(row[groupingIndex] ?? '').trim(),
    }))
    .filter((row) => row.name || row.team);
}

function parseCsv(content: string): ParticipantImportRow[] {
  const rows = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(splitCsvLine);

  return rowsFromValues(rows);
}

async function parseXlsx(file: File): Promise<ParticipantImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];

  if (!worksheet) return [];

  const values: unknown[][] = [];
  worksheet.eachRow((row) => {
    const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
    values.push(rowValues);
  });

  return rowsFromValues(values);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing upload file' }, { status: 400 });
  }

  try {
    const lowerName = file.name.toLowerCase();
    const rows = lowerName.endsWith('.xlsx')
      ? await parseXlsx(file)
      : parseCsv(await file.text());

    return Response.json({ rows });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to parse upload file' },
      { status: 400 }
    );
  }
}
