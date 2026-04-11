import { fetchValues } from '../lib/sheets';
import {
  PPCManifestItem, PPCData,
  PPCMaterial, PPCPrintMethod, PPCPrintFormat, PPCPrintRate,
  PPCAttachment, PPCPackaging, PPCRule, PPCCost, PPCPricing,
} from '../types';
import { bmcRegistry } from '../lib/dataRegistry';

// Helper functions (adapted from original JS)
const keyfy = (s: string | undefined): string => String(s || '').trim().toLowerCase().replace(/\s+/g, '_');
const norm = (s: string | undefined): string => String(s || '').trim();

function parseCSV(t: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let f: string = '';
  let q: boolean = false; // quoted

  for (let i = 0; i < t.length; i++) {
    const c = t[i], n = t[i + 1];
    if (q) {
      if (c === '"' && n === '"') {
        f += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else {
        f += c;
      }
    } else {
      if (c === '"') {
        q = true;
      } else if (c === ',') {
        row.push(f);
        f = '';
      } else if (c === '\n') {
        row.push(f);
        out.push(row.slice());
        row.length = 0;
        f = '';
      } else if (c !== '\r') {
        f += c;
      }
    }
  }
  if (f.length || row.length) {
    row.push(f);
    out.push(row);
  }
  return out.filter(r => r.some(c => norm(c) !== ''));
}

function tableToObjects<T>(rows: string[][]): T[] {
  if (rows.length === 0) return [];
  const h = rows[0].map(keyfy);
  return rows.slice(1).map(r => {
    const o: { [key: string]: string } = {};
    h.forEach((k, i) => o[k] = r[i] ?? '');
    return o as T;
  }).filter(o => Object.values(o).some(v => norm(v) !== ''));
}

export async function fetchPPCManifest(sheetId: string): Promise<PPCManifestItem[]> {
  const manifestConfig = bmcRegistry.ppc;
  if (manifestConfig.spreadsheetId !== sheetId) {
    throw new Error(`PPC manifest sheet ID mismatch. Expected ${manifestConfig.spreadsheetId}, got ${sheetId}`);
  }
  const range = `'${manifestConfig.sheetName}'!A:Z`;
  const response = await fetchValues(sheetId, range);
  if (!response.values) return [];
  return tableToObjects<PPCManifestItem>(response.values);
}

export async function fetchPPCSheetData(baseSheetId: string, manifest: PPCManifestItem[]): Promise<PPCData> {
  const db: PPCData = {
    materials: [], print_methods: [], print_formats: [], print_rates: [],
    attachments: [], packaging: [], rules: [], costs: [], pricing: []
  };

  const activeManifest = manifest.filter(r => String(r.active).toLowerCase() === 'true');

  for (const row of activeManifest) {
    const name = keyfy(row.table_name);
    const gid = norm(row.gid);
    if (!gid) continue;

    const range = `'${row.table_name}'!A:Z`; // Assuming sheet_name is the table_name
    const response = await fetchValues(baseSheetId, range);
    if (response.values) {
      switch (name) {
        case 'materials':
          db.materials = tableToObjects<PPCMaterial>(response.values);
          break;
        case 'print_methods':
          db.print_methods = tableToObjects<PPCPrintMethod>(response.values);
          break;
        case 'print_formats':
          db.print_formats = tableToObjects<PPCPrintFormat>(response.values);
          break;
        case 'print_rates':
          db.print_rates = tableToObjects<PPCPrintRate>(response.values);
          break;
        case 'attachments':
          db.attachments = tableToObjects<PPCAttachment>(response.values);
          break;
        case 'packaging':
          db.packaging = tableToObjects<PPCPackaging>(response.values);
          break;
        case 'rules':
          db.rules = tableToObjects<PPCRule>(response.values);
          break;
        case 'costs':
          db.costs = tableToObjects<PPCCost>(response.values);
          break;
        case 'pricing':
          db.pricing = tableToObjects<PPCPricing>(response.values);
          break;
        default:
          console.warn(`Unknown table_name in manifest: ${name}`);
      }
    }
  }
  return db;
}
