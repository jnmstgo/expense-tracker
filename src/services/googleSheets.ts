import type { Expense } from '@/types';

// Spreadsheet headers matching Expense keys
const HEADERS = [
  'id',
  'userId',
  'timestamp',
  'amount',
  'currency',
  'category',
  'merchant',
  'description',
  'locationLat',
  'locationLng',
  'city',
  'receiptUrl',
  'aiConfidence',
  'createdAt'
];

/**
 * Searches user's Google Drive for a sheet titled 'AI Expense Tracker'.
 * If it doesn't exist, it creates one and appends the column headers.
 */
export async function getOrCreateSpreadsheet(
  accessToken: string,
  _userId: string
): Promise<string> {
  const query = encodeURIComponent(
    "name = 'AI Expense Tracker' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!searchRes.ok) {
    const err = await searchRes.text();
    console.error('Google Drive search failed:', err);
    throw new Error('Failed to search Google Drive for spreadsheet');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new spreadsheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: 'AI Expense Tracker' }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Spreadsheet creation failed:', err);
    throw new Error('Failed to create a new spreadsheet in Google Sheets');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;

  // Insert column headers
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:N1:append?valueInputOption=USER_ENTERED`;
  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [HEADERS]
    })
  });

  if (!appendRes.ok) {
    console.warn('Could not write column headers, proceeding anyway');
  }

  return spreadsheetId;
}

/**
 * Appends a modular expense row to the Google Sheet.
 */
export async function appendExpense(
  accessToken: string,
  spreadsheetId: string,
  expense: Expense
): Promise<any> {
  const row = [
    expense.id,
    expense.userId,
    expense.timestamp,
    expense.amount,
    expense.currency,
    expense.category,
    expense.merchant,
    expense.description,
    expense.locationLat !== null ? expense.locationLat : '',
    expense.locationLng !== null ? expense.locationLng : '',
    expense.city || '',
    expense.receiptUrl || '',
    expense.aiConfidence !== null ? expense.aiConfidence : '',
    expense.createdAt
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:N:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [row]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to append row:', err);
    throw new Error('Error al guardar en Google Sheets');
  }

  return res.json();
}

/**
 * Fetches all expenses from the Google Sheet, parsing them back to modular Expense objects.
 * Filters by current user ID.
 */
export async function fetchExpenses(
  accessToken: string,
  spreadsheetId: string,
  userId: string
): Promise<Expense[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:N`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to fetch spreadsheet rows:', err);
    throw new Error('Error al obtener datos de Google Sheets');
  }

  const data = await res.json();
  const rows = data.values || [];

  return rows
    .map((row: any[]) => ({
      id:           row[0] || '',
      userId:       row[1] || '',
      timestamp:    row[2] || '',
      amount:       parseFloat(row[3]) || 0,
      currency:     row[4] || '',
      category:     row[5] || 'Other',
      merchant:     row[6] || '',
      description:  row[7] || '',
      locationLat:  row[8] !== undefined && row[8] !== '' ? parseFloat(row[8]) : null,
      locationLng:  row[9] !== undefined && row[9] !== '' ? parseFloat(row[9]) : null,
      city:         row[10] || null,
      receiptUrl:   row[11] || null,
      aiConfidence: row[12] !== undefined && row[12] !== '' ? parseFloat(row[12]) : null,
      createdAt:    row[13] || '',
      synced:       true
    }))
    .filter((exp: Expense) => exp.userId === userId);
}

/**
 * Deletes the matching row of the given expense ID.
 * Locates the row index and fires a deleteDimension batchUpdate call.
 */
export async function deleteExpenseRow(
  accessToken: string,
  spreadsheetId: string,
  id: string
): Promise<any> {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:A`;
  const readRes = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!readRes.ok) {
    throw new Error('Failed to find row for deletion');
  }

  const readData = await readRes.json();
  const rows = readData.values || [];
  const rowIndex = rows.findIndex((row: any[]) => row[0] === id);

  if (rowIndex === -1) {
    throw new Error('Expense row not found in sheet');
  }

  // Get first sheet's ID dynamically
  let sheetId = 0;
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const sheet = metaData.sheets?.[0];
      if (sheet?.properties?.sheetId !== undefined) {
        sheetId = sheet.properties.sheetId;
      }
    }
  } catch (e) {
    console.warn('Could not read dynamic sheetId, using fallback 0', e);
  }

  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const deleteRes = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    })
  });

  if (!deleteRes.ok) {
    const err = await deleteRes.text();
    console.error('Row deletion failed:', err);
    throw new Error('Failed to delete expense row from Google Sheets');
  }

  return deleteRes.json();
}
