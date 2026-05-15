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
const SCORE_SHEET_SHUFFLES = 7;

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

function styleScoreHeaderCell(cell: ExcelJS.Cell, fontSize = 11) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: fontSize };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF18181B' },
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function setThinBlackBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
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
    views: [{ state: 'frozen', ySplit: 3, topLeftCell: 'A4', activeCell: 'A4' }],
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

function addTableScoreSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  phase: number,
  generatedAt: string,
  table: Awaited<ReturnType<typeof getPrintableTablePairings>>[number]
) {
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ state: 'frozen', ySplit: 4, topLeftCell: 'A5', activeCell: 'A5', showGridLines: true }],
  });

  worksheet.columns = [
    { key: 'table', width: 8 },
    { key: 'shuffle', width: 10 },
    { key: 'player1', width: 22 },
    { key: 'player2', width: 22 },
    { key: 'player3', width: 22 },
    { key: 'player4', width: 22 },
    { key: 'player5', width: 22 },
  ];

  worksheet.mergeCells('A1:G1');
  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A1').value = 'Remi 13 - Table Pairings';
  worksheet.getCell('A2').value = `Phase ${phase} • Generated ${generatedAt}`;

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getCell('A1').font = { bold: true, size: 18 };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A2').font = { bold: true, size: 12 };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const players = table.players.slice(0, 5);
  const headerRow = worksheet.getRow(3);
  headerRow.values = ['Table', 'Shuffle', ...players.map((player) => player.name)];
  headerRow.height = 22;
  const teamRow = worksheet.getRow(4);
  teamRow.values = ['', '', ...players.map((player) => player.team)];
  teamRow.height = 18;

  for (let column = 1; column <= 7; column += 1) {
    styleScoreHeaderCell(headerRow.getCell(column), column <= 2 ? 11 : 12);
    styleScoreHeaderCell(teamRow.getCell(column), 8);
  }
  worksheet.mergeCells('A3:A4');
  worksheet.mergeCells('B3:B4');

  for (let i = 0; i < SCORE_SHEET_SHUFFLES; i += 1) {
    const row = worksheet.getRow(5 + i);
    row.values = [table.number, i + 1, '', '', '', '', ''];
    row.height = 22;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  worksheet.getRow(12).height = 22;
  worksheet.mergeCells('A13:B13');
  const totalRow = worksheet.getRow(13);
  totalRow.height = 22;
  worksheet.getCell('A13').value = 'Total Score';
  worksheet.getCell('A13').font = { bold: true, size: 12 };
  worksheet.getCell('A13').alignment = { horizontal: 'center', vertical: 'middle' };

  for (let row = 3; row <= 13; row += 1) {
    for (let column = 1; column <= 7; column += 1) {
      const cell = worksheet.getRow(row).getCell(column);
      setThinBlackBorder(cell);
      cell.alignment = cell.alignment ?? { horizontal: 'center', vertical: 'middle' };
    }
  }

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
    addTableScoreSheet(
      workbook,
      `Table ${table.number}`,
      phase,
      generatedAt,
      table
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
