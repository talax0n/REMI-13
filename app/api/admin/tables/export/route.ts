export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import ExcelJS from 'exceljs';
import { getPrintableTablePairings } from '@/lib/tables-store';
import { query } from '@/lib/db';

interface TournamentStateRow {
  phase: number;
}

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function safeFilenamePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatGeneratedAt(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function styleTitleRow(worksheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = worksheet.getRow(rowNumber);
  row.font = { bold: true, size: rowNumber === 1 ? 16 : 11 };
  row.alignment = { vertical: 'middle' };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF18181B' },
  };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
}

function styleTableBorders(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, columnCount: number) {
  for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      row.getCell(columnNumber).border = {
        top: { style: 'thin', color: { argb: 'FFD4D4D8' } },
        left: { style: 'thin', color: { argb: 'FFD4D4D8' } },
        bottom: { style: 'thin', color: { argb: 'FFD4D4D8' } },
        right: { style: 'thin', color: { argb: 'FFD4D4D8' } },
      };
      row.getCell(columnNumber).alignment = { vertical: 'middle' };
    }
  }
}

function addPairingSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  phase: number,
  generatedAt: string,
  tables: Awaited<ReturnType<typeof getPrintableTablePairings>>,
  singleTableNumber?: number
) {
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  worksheet.columns = [
    { key: 'table', width: 10 },
    { key: 'seat', width: 8 },
    { key: 'name', width: 28 },
    { key: 'team', width: 24 },
    { key: 'score', width: 14 },
    { key: 'signature', width: 18 },
  ];

  worksheet.mergeCells('A1:F1');
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A2').value = `Babak ${phase} · Generated ${generatedAt}`;
  styleTitleRow(worksheet, 1);
  styleTitleRow(worksheet, 2);

  const header = worksheet.addRow(['Table', 'Seat', 'Name', 'Team', 'Score', 'Signature']);
  styleHeaderRow(header);

  const printableTables = singleTableNumber
    ? tables.filter((table) => table.number === singleTableNumber)
    : tables;

  printableTables.forEach((table) => {
    table.players.forEach((player, index) => {
      worksheet.addRow([table.number, index + 1, player.name, player.team, '', '']);
    });

    const blankSeats = Math.max(0, 5 - table.players.length);
    for (let i = 0; i < blankSeats; i += 1) {
      worksheet.addRow([table.number, table.players.length + i + 1, 'Empty Seat', '', '', '']);
    }

    if (!singleTableNumber) worksheet.addRow([]);
  });

  const lastRow = worksheet.lastRow?.number ?? 4;
  styleTableBorders(worksheet, 3, lastRow, 6);
  worksheet.eachRow((row) => {
    row.height = row.number <= 2 ? 24 : 22;
  });
  worksheet.getColumn('score').alignment = { horizontal: 'center' };
  worksheet.getColumn('table').alignment = { horizontal: 'center' };
  worksheet.getColumn('seat').alignment = { horizontal: 'center' };

  return worksheet;
}

export async function GET() {
  const [tables, stateRows] = await Promise.all([
    getPrintableTablePairings(),
    query<TournamentStateRow>('SELECT phase FROM tournament_state WHERE id = 1'),
  ]);

  if (tables.length === 0) {
    return Response.json({ error: 'No table pairings available to export' }, { status: 404 });
  }

  const phase = stateRows[0]?.phase ?? 1;
  const generatedAt = formatGeneratedAt(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Remi 13 Admin';
  workbook.created = new Date();

  addPairingSheet(
    workbook,
    'All Tables',
    'Remi 13 - Table Pairings',
    phase,
    generatedAt,
    tables
  );

  tables.forEach((table) => {
    addPairingSheet(
      workbook,
      `Table ${table.number}`,
      `Remi 13 - Table ${table.number} Score Sheet`,
      phase,
      generatedAt,
      tables,
      table.number
    );
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `remi-13-pairings-phase-${safeFilenamePart(String(phase))}.xlsx`;

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
