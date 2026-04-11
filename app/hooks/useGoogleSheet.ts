
import { useCallback } from 'react';
import { fetchValues, updateValues, appendValues, fetchHeaders } from '../lib/sheets';
import { useToast } from '../contexts/ToastContext';

interface SheetOptions {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}

export const useGoogleSheet = (options: SheetOptions) => {
  const { addToast } = useToast();
  const { spreadsheetId, sheetName, headerRow } = options;

  const fetch = useCallback(async (range: string = 'A:Z') => {
    try {
      const response = await fetchValues(spreadsheetId, `'${sheetName}'!${range}`);
      return response.values || [];
    } catch (err: any) {
      addToast(`Fetch Error [${sheetName}]: ${err.message}`, 'error');
      throw err;
    }
  }, [spreadsheetId, sheetName, addToast]);

  const update = useCallback(async (rowNumber: number, data: string[][]) => {
    try {
      const range = `'${sheetName}'!A${rowNumber}`;
      await updateValues(spreadsheetId, range, data);
      addToast(`Updated ${sheetName} successfully`, 'success');
    } catch (err: any) {
      addToast(`Update Error [${sheetName}]: ${err.message}`, 'error');
      throw err;
    }
  }, [spreadsheetId, sheetName, addToast]);

  const append = useCallback(async (data: string[][]) => {
    try {
      await appendValues(spreadsheetId, sheetName, data);
      addToast(`Added record to ${sheetName}`, 'success');
    } catch (err: any) {
      addToast(`Append Error [${sheetName}]: ${err.message}`, 'error');
      throw err;
    }
  }, [spreadsheetId, sheetName, addToast]);

  return { fetch, update, append };
};
