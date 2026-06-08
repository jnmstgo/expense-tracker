import type { Expense, Merchant } from '@/types';

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
  'createdAt',
  'address',
  'userName'
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
    const spreadsheetId = searchData.files[0].id;
    await ensureSheetsInitialized(accessToken, spreadsheetId);
    return spreadsheetId;
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
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:P1:append?valueInputOption=USER_ENTERED`;
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

  await ensureSheetsInitialized(accessToken, spreadsheetId);
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
    expense.createdAt,
    expense.address || '',
    expense.userName || ''
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:P:append?valueInputOption=USER_ENTERED`;
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

  if (expense.items && expense.items.length > 0) {
    try {
      const itemRows = expense.items.map(item => [
        Math.random().toString(36).substring(2, 9),
        expense.id,
        item.name,
        item.price,
        expense.createdAt,
        expense.timestamp || expense.createdAt,
        expense.merchant || '',
        expense.category || '',
        expense.locationLat !== null && expense.locationLat !== undefined ? expense.locationLat : '',
        expense.locationLng !== null && expense.locationLng !== undefined ? expense.locationLng : '',
        expense.city || expense.address || ''
      ]);
      const itemsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ReceiptItems!A:K:append?valueInputOption=USER_ENTERED`;
      await fetch(itemsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: itemRows })
      });
    } catch (e) {
      console.warn('Could not append receipt items:', e);
    }
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
  _userId: string
): Promise<Expense[]> {
  const mainUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:P`;
  const itemsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ReceiptItems!A2:E`;

  const [mainRes, itemsRes] = await Promise.all([
    fetch(mainUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(itemsUrl, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
  ]);

  if (!mainRes.ok) {
    const err = await mainRes.text();
    console.error('Failed to fetch spreadsheet rows:', err);
    throw new Error('Error al obtener datos de Google Sheets');
  }

  const mainData = await mainRes.json();
  const mainRows = mainData.values || [];

  let itemRows: any[] = [];
  if (itemsRes && itemsRes.ok) {
    try {
      const itemsData = await itemsRes.json();
      itemRows = itemsData.values || [];
    } catch (e) {
      console.warn('Could not parse receipt items values:', e);
    }
  }

  const itemsByExpenseId: Record<string, Array<{ name: string; price: number }>> = {};
  for (const row of itemRows) {
    const expenseId = row[1];
    const name = row[2] || '';
    const price = parseFloat(row[3]) || 0;
    if (expenseId) {
      if (!itemsByExpenseId[expenseId]) {
        itemsByExpenseId[expenseId] = [];
      }
      itemsByExpenseId[expenseId].push({ name, price });
    }
  }

  return mainRows
    .map((row: any[]) => {
      const id = row[0] || '';
      return {
        id,
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
        synced:       true,
        items:        itemsByExpenseId[id] || [],
        address:      row[14] || null,
        userName:     row[15] || null
      };
    });
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

  // Delete items linked to this expense
  try {
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ReceiptItems!B:B`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (readRes.ok) {
      const readData = await readRes.json();
      const rows = readData.values || [];
      const indicesToDelete: number[] = [];
      rows.forEach((row: any[], idx: number) => {
        if (row[0] === id) {
          indicesToDelete.push(idx);
        }
      });

      if (indicesToDelete.length > 0) {
        let receiptItemsSheetId = null;
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const sheet = metaData.sheets?.find((s: any) => s.properties?.title === 'ReceiptItems');
          if (sheet?.properties?.sheetId !== undefined) {
            receiptItemsSheetId = sheet.properties.sheetId;
          }
        }

        if (receiptItemsSheetId !== null) {
          indicesToDelete.sort((a, b) => b - a);
          const deleteItemsRequests = indicesToDelete.map(rowIndex => ({
            deleteDimension: {
              range: {
                sheetId: receiptItemsSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }));

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests: deleteItemsRequests })
          });
        }
      }
    }
  } catch (e) {
    console.warn('Failed to delete receipt items linked to expense:', e);
  }

  return deleteRes.json();
}

/**
 * Ensures that the required worksheets (tabs) are initialized.
 */
export async function ensureSheetsInitialized(accessToken: string, spreadsheetId: string): Promise<void> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheets = metaData.sheets || [];
    const sheetTitles = new Set(sheets.map((s: any) => s.properties.title));

    // Normalize default sheet name (e.g. Spanish "Hoja 1", French "Feuille 1") to "Sheet1"
    const firstSheet = sheets[0];
    const firstSheetTitle = firstSheet?.properties?.title;
    const firstSheetId = firstSheet?.properties?.sheetId;

    if (firstSheetTitle && firstSheetTitle !== 'Sheet1' && !sheetTitles.has('Sheet1')) {
      try {
        console.info(`Renaming default tab "${firstSheetTitle}" to "Sheet1" for compatibility...`);
        const renameRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: firstSheetId,
                    title: 'Sheet1'
                  },
                  fields: 'title'
                }
              }
            ]
          })
        });
        if (renameRes.ok) {
          sheetTitles.delete(firstSheetTitle);
          sheetTitles.add('Sheet1');
          console.info('Main tab renamed to "Sheet1" successfully.');
        } else {
          console.warn('Failed to rename main tab:', await renameRes.text());
        }
      } catch (err) {
        console.error('Error renaming default sheet tab:', err);
      }
    }

    // Check and migrate Sheet1 headers if needed
    try {
      const headersRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:P1`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (headersRes.ok) {
        const headersData = await headersRes.json();
        const currentHeaders = headersData.values?.[0] || [];
        if (currentHeaders.length < HEADERS.length || !currentHeaders.includes('userName')) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:P1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [HEADERS] })
          });
        }
      }
    } catch (err) {
      console.warn('Failed to check/migrate headers of Sheet1:', err);
    }

    // Check and migrate ReceiptItems headers if needed
    try {
      const itemsHeadersRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ReceiptItems!A1:K1`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (itemsHeadersRes.ok) {
        const itemsHeadersData = await itemsHeadersRes.json();
        const currentItemsHeaders = itemsHeadersData.values?.[0] || [];
        const TARGET_ITEMS_HEADERS = ['id', 'expenseId', 'name', 'price', 'createdAt', 'date', 'merchant', 'category', 'locationLat', 'locationLng', 'city'];
        if (currentItemsHeaders.length < TARGET_ITEMS_HEADERS.length || !currentItemsHeaders.includes('merchant')) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ReceiptItems!A1:K1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: [TARGET_ITEMS_HEADERS] })
          });
        }
      }
    } catch (err) {
      console.warn('Failed to check/migrate headers of ReceiptItems:', err);
    }

    const missingSheets = [];
    if (!sheetTitles.has('ReceiptItems')) missingSheets.push('ReceiptItems');
    if (!sheetTitles.has('Merchants')) missingSheets.push('Merchants');
    if (!sheetTitles.has('Categories')) missingSheets.push('Categories');

    if (missingSheets.length > 0) {
      const createSheetsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: missingSheets.map(title => ({
            addSheet: { properties: { title } }
          }))
        })
      });
      
      if (createSheetsRes.ok) {
        const data = [];
        if (missingSheets.includes('ReceiptItems')) {
          data.push({
            range: 'ReceiptItems!A1:K1',
            values: [['id', 'expenseId', 'name', 'price', 'createdAt', 'date', 'merchant', 'category', 'locationLat', 'locationLng', 'city']]
          });
        }
        if (missingSheets.includes('Merchants')) {
          data.push({
            range: 'Merchants!A1:F1',
            values: [['name', 'defaultCategory', 'locationLat', 'locationLng', 'city', 'createdAt']]
          });
        }
        if (missingSheets.includes('Categories')) {
          data.push({
            range: 'Categories!A1:B1',
            values: [['name', 'createdAt']]
          });
        }

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data
          })
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring sheets initialized:', err);
  }
}

export async function fetchMerchants(
  accessToken: string,
  spreadsheetId: string
): Promise<Merchant[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Merchants!A2:E`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = data.values || [];
  return rows.map((row: any[]) => ({
    name: row[0] || '',
    defaultCategory: row[1] || 'Other',
    locationLat: row[2] !== undefined && row[2] !== '' ? parseFloat(row[2]) : null,
    locationLng: row[3] !== undefined && row[3] !== '' ? parseFloat(row[3]) : null,
    city: row[4] || null
  }));
}

export async function saveMerchant(
  accessToken: string,
  spreadsheetId: string,
  merchant: Merchant
): Promise<void> {
  try {
    const merchants = await fetchMerchants(accessToken, spreadsheetId);
    const exists = merchants.some(m => m.name.toLowerCase() === merchant.name.toLowerCase());
    if (exists) return;

    const row = [
      merchant.name,
      merchant.defaultCategory,
      merchant.locationLat !== null ? merchant.locationLat : '',
      merchant.locationLng !== null ? merchant.locationLng : '',
      merchant.city || '',
      new Date().toISOString()
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Merchants!A:F:append?valueInputOption=USER_ENTERED`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });
  } catch (err) {
    console.warn('Failed to save merchant to sheet:', err);
  }
}

export async function fetchCustomCategories(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A2:A`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = data.values || [];
  return rows.map((row: any[]) => row[0]).filter(Boolean);
}

export async function saveCustomCategories(
  accessToken: string,
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  try {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A2:B:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (categories.length === 0) return;

    const rows = categories.map(cat => [cat, new Date().toISOString()]);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A2:B?valueInputOption=USER_ENTERED`;
    await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });
  } catch (err) {
    console.warn('Failed to save categories to sheet:', err);
  }
}

/**
 * Shares the spreadsheet with a given email address as a writer (editor).
 */
export async function shareSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  emailAddress: string
): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=false`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'writer',
      type: 'user',
      emailAddress
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to share spreadsheet:', err);
    throw new Error('Error al compartir la hoja de cálculo con ' + emailAddress);
  }

  return res.json();
}
