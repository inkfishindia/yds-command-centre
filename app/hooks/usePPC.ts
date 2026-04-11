import { useCallback, useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { fetchPPCManifest, fetchPPCSheetData } from '../services/ppcService';
import { fetchValues } from '../lib/sheets';
import { getEnv } from '../lib/env';
import { requestAllGoogleApiTokens } from '../lib/googleAuth';
import {
  PPCData, PPCManifestItem, PPCMaterial, PPCPrintMethod, PPCPrintFormat, PPCPrintRate,
  PPCAttachment, PPCPackaging, PPCRule, PPCCost, PPCPricing,
  MaterialCostBasis, PrintMethodType, PPCDiagnostics, PPCCalculationResult,
} from '../types';
import { bmcRegistry } from '../lib/dataRegistry';

// Key for local storage
const PPC_SHEET_ID_LS_KEY = 'ppc_google_sheet_id';
const DEFAULT_PPC_SHEET_ID_ENV_KEY = 'PPC_GOOGLE_SHEET_ID';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr = (n: number | string | undefined | null) => INR.format(Number(n || 0));
const keyfy = (s: string | undefined): string => String(s || '').trim().toLowerCase().replace(/\s+/g, '_');
const norm = (s: string | undefined): string => String(s || '').trim();

// FIX: Removed duplicate local declarations of PPCDiagnostics and PPCCalculationResult
// as they are already imported from '../types'.

interface PPCPlanResult {
  method: string;
  lines: Array<{
    method: string;
    format: PPCPrintFormat;
    pps: number;
    sheets: number;
    rate_per_sheet: number;
  }>;
  total_sheets: number;
  total_sheet_cost: number;
  total_capacity_pieces: number;
  print_per_piece: number;
  objective: string;
}

const ppcDataFetcher = async (key: string, ppcSheetId: string, isSignedIn: boolean) => {
  if (!isSignedIn) {
    throw new Error("Please sign in to load PPC data.");
  }
  if (!ppcSheetId) {
    throw new Error("PPC Spreadsheet ID is not configured.");
  }

  const manifest = await fetchPPCManifest(ppcSheetId);
  const data = await fetchPPCSheetData(ppcSheetId, manifest);
  return data;
};

export const usePPC = () => {
  const { isSignedIn, isMockMode, signIn } = useAuth();
  const { addToast } = useToast();

  const [ppcSheetId, setPpcSheetIdState] = useState<string>(() => {
    const storedId = localStorage.getItem(PPC_SHEET_ID_LS_KEY);
    if (storedId) return storedId;
    try {
      return getEnv(DEFAULT_PPC_SHEET_ID_ENV_KEY) || '';
    } catch (e) {
      return '';
    }
  });

  const setPpcSheetId = useCallback((id: string) => {
    localStorage.setItem(PPC_SHEET_ID_LS_KEY, id);
    setPpcSheetIdState(id);
  }, []);

  const { data: ppcData, error, isLoading, mutate } = useSWR(
    ppcSheetId && isSignedIn && !isMockMode ? ['ppcData', ppcSheetId, isSignedIn] : null,
    ([key, id, signedIn]) => ppcDataFetcher(key, id, signedIn),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [calculationResult, setCalculationResult] = useState<PPCCalculationResult | null>(null);

  const handleGrantSheetsAccess = useCallback(async () => {
    setShowPermissionPrompt(false);
    try {
      await requestAllGoogleApiTokens();
      addToast("Access granted! Reloading PPC data...", "success");
      mutate();
    } catch (err: any) {
      const msg = err.message || "Failed to grant access.";
      addToast(msg, "error");
      // If permission is denied, keep showing the prompt
      setShowPermissionPrompt(true);
    }
  }, [addToast, mutate]);

  useEffect(() => {
    if (error && (error.message.includes('token request failed') || error.message.includes('insufficient permissions'))) {
      setShowPermissionPrompt(true);
    } else if (error) {
      setShowPermissionPrompt(false); // Hide if it's not a permission error
    }
  }, [error]);

  const loadPPCData = useCallback(async (forceRefresh = false) => {
    if (isMockMode) {
      // Mock data logic can be added here if needed, otherwise it will just show empty state
      // For now, let's keep it simple and just set a mock error if no live data.
      return;
    }
    if (!isSignedIn) {
      addToast("Please sign in to load PPC data.", "error");
      return;
    }
    if (!ppcSheetId) {
      addToast("PPC Spreadsheet ID is not configured. Please enter one.", "error");
      return;
    }
    await mutate();
  }, [isMockMode, isSignedIn, ppcSheetId, addToast, mutate]);


  const getCost = useCallback((key: string, def: number = 0): number => {
    if (!ppcData) return def;
    const row = ppcData.costs.find(r => keyfy(r.key) === keyfy(key));
    const v = parseFloat(row?.value || '');
    return isFinite(v) ? v : def;
  }, [ppcData]);

  const piecesPerSheet = useCallback((fmt: PPCPrintFormat, wmm: number, hmm: number): number => {
    const W = parseFloat(fmt.width_mm || '0'), H = parseFloat(fmt.height_mm || '0'), rot = String(fmt.allow_rotation).toLowerCase() === 'true';
    const fit = (sheetW: number, sheetH: number, pieceW: number, pieceH: number) => {
      // Ensure dimensions are positive to avoid division by zero or negative results
      if (sheetW <= 0 || sheetH <= 0 || pieceW <= 0 || pieceH <= 0) return 0;
      return Math.floor(sheetW / pieceW) * Math.floor(sheetH / pieceH);
    };

    if (isNaN(W) || isNaN(H) || W <= 0 || H <= 0) return 0; // Handle invalid format dimensions

    let p = fit(W, H, wmm, hmm);
    if (rot) p = Math.max(p, fit(W, H, hmm, wmm));
    return p;
  }, []);

  // FIX: Changed `methodKey: PrintMethodType` to `methodKey: string` to resolve type inference issues.
  const applyRules = useCallback((methodKey: string, materialKey: string, widthIn: number, heightIn: number) => {
    if (!ppcData) return { ok: true };
    const activeRules = ppcData.rules.filter(r => String(r.active).toLowerCase() === 'true');
    const normMethodKey = keyfy(methodKey);
    const normMaterialKey = keyfy(materialKey);

    for (const r of activeRules) {
      const type = keyfy(r.rule_type), p1 = keyfy(r.param1), p2 = keyfy(r.param2), val = norm(r.value), msg = r.message || 'Invalid.';
      
      // FIX: Ensure comparison is always against normalized keys
      if (type === 'method_requires_material' && normMethodKey === p1) {
        if (normMaterialKey !== p2) { 
          // If a method requires a specific material, but a different one is selected, 
          // allow the calculation to proceed but warn the user or suggest a fix.
          // For now, it simply marks the rule as broken for this combo
          // FIX: Changed toast type from 'warning' to 'info' as per guidelines.
          addToast(`Rule violation: ${methodKey} requires ${p2.replace(/_/g, ' ')} material.`, 'info');
          // FIX: Return a specific fix. For now, defaulting to digital.
          return { ok: true, fix: { method: PrintMethodType.DIGITAL } };
        }
      }
      if (type === 'method_max_dim_in' && normMethodKey === p1 && keyfy(p2) === 'max_side_in') {
        const lim = parseFloat(val);
        if (isFinite(lim) && Math.max(widthIn, heightIn) > lim) return { ok: false, reason: msg };
      }
    }
    return { ok: true };
  }, [ppcData, addToast]);

  const planMixedFormats = useCallback((methodPref: PrintMethodType, pieceWmm: number, pieceHmm: number, qty: number, opts = {}): PPCPlanResult | null => {
    if (!ppcData) return null;
    const {
      objective = 'min_cost',
      epsilon = 1e-6,
      preferSingleIfFits = true,
      singleSheetPremiumPct = 0.10
    } = opts as { objective?: string; epsilon?: number; preferSingleIfFits?: boolean; singleSheetPremiumPct?: number };

    const formats = ppcData.print_formats.filter(f => String(f.active).toLowerCase() === 'true');
    let rateRows = ppcData.print_rates.filter(r => String(r.active).toLowerCase() === 'true');
    rateRows = rateRows.filter(r => keyfy(r.method_key) === keyfy(methodPref)); // Filter by the specific methodPref

    const cand: any[] = [];
    for (const r of rateRows) {
      const fmt = formats.find(f => keyfy(f.format_key) === keyfy(r.format_key));
      if (!fmt) continue;
      const sheetRate = parseFloat(r.rate_per_sheet);
      if (!isFinite(sheetRate)) continue;

      const pps = piecesPerSheet(fmt, pieceWmm, pieceHmm);
      if (pps <= 0) { /* console.warn(`[planner] no fit on ${fmt.format_key}`); */ continue; }

      const setup = parseFloat(ppcData.costs.find(c => keyfy(c.key) === "sheet_setup_cost")?.value || '0') || 0;

      cand.push({
        method: r.method_key,
        format: fmt,
        pps,
        sheetCost: sheetRate + setup
      });
    }
    if (cand.length === 0) return null;

    // Fast path: if single sheet can carry all, optionally prefer it
    const singles = cand.filter(c => c.pps >= qty);
    let bestSingle = null;
    if (singles.length) {
      bestSingle = singles.reduce((b, c) => (!b || c.sheetCost < b.sheetCost) ? c : b, null);
    }

    // Unbounded min-cost cover DP across capacity
    const maxPps = Math.max(...cand.map(c => c.pps));
    const CAP = qty + maxPps; // allow overage
    const INF = 1e15;

    const cost = new Array(CAP + 1).fill(INF);
    const sheets = new Array(CAP + 1).fill(Infinity);
    const prev = new Array(CAP + 1).fill(-1);
    const pick = new Array(CAP + 1).fill(-1);

    cost[0] = 0; sheets[0] = 0;

    for (let c = 0; c <= CAP; c++) {
      if (cost[c] === INF) continue;
      for (let i = 0; i < cand.length; i++) {
        const k = cand[i];
        const c2 = Math.min(CAP, c + k.pps);
        const newCost = cost[c] + k.sheetCost;
        const newSheets = sheets[c] + 1;

        let better = newCost + epsilon < cost[c2];
        if (!better && Math.abs(newCost - cost[c2]) <= epsilon) {
          if (objective === 'min_sheets') better = newSheets < sheets[c2];
          else better = newSheets < sheets[c2]; // min_cost, tie-break fewer sheets
        }
        if (better) {
          cost[c2] = newCost;
          sheets[c2] = newSheets;
          prev[c2] = c;
          pick[c2] = i;
        }
      }
    }

    // Best capacity ≥ qty
    let bestCap = -1;
    for (let c = qty; c <= CAP; c++) {
      if (cost[c] === INF) continue;
      if (bestCap === -1) { bestCap = c; continue; }

      let better = cost[c] + epsilon < cost[bestCap];
      if (!better && Math.abs(cost[c] - cost[bestCap]) <= epsilon) {
        if (sheets[c] < sheets[bestCap]) better = true;
        else if (sheets[c] === sheets[bestCap] && c < bestCap) better = true;
      }
      if (better) bestCap = c;
    }
    if (bestCap === -1) return null;

    // Prefer single sheet within premium
    if (preferSingleIfFits && bestSingle) {
      const dpCost = cost[bestCap];
      const singleCost = bestSingle.sheetCost;
      if (singleCost <= dpCost * (1 + singleSheetPremiumPct) + epsilon) {
        const lines = [{
          method: bestSingle.method,
          format: bestSingle.format,
          pps: bestSingle.pps,
          sheets: 1,
          rate_per_sheet: singleCost
        }];
        const total_sheets = 1;
        const total_sheet_cost = singleCost;
        const total_capacity_pieces = bestSingle.pps;
        return {
          method: methodPref,
          lines,
          total_sheets,
          total_sheet_cost,
          total_capacity_pieces,
          print_per_piece: total_sheet_cost / qty,
          objective
        };
      }
    }

    // Backtrack
    const counts = new Map<number, number>();
    for (let cur = bestCap; cur > 0;) {
      const i = pick[cur];
      if (i === -1) break;
      counts.set(i, (counts.get(i) || 0) + 1);
      cur = prev[cur];
    }

    const lines = [];
    counts.forEach((n, i) => {
      const k = cand[i];
      lines.push({
        method: k.method,
        format: k.format,
        pps: k.pps,
        sheets: n,
        rate_per_sheet: k.sheetCost
      });
    });

    const total_sheets = lines.reduce((s, l) => s + l.sheets, 0);
    const total_sheet_cost = lines.reduce((s, l) => s + l.sheets * l.rate_per_sheet, 0);
    const total_capacity_pieces = lines.reduce((s, l) => s + l.sheets * l.pps, 0);

    return {
      method: methodPref,
      lines,
      total_sheets,
      total_sheet_cost,
      total_capacity_pieces,
      print_per_piece: total_sheet_cost / qty,
      objective
    };
  }, [ppcData, piecesPerSheet]);

  const priceForModule = useCallback((costPerPiece: number, qty: number, moduleKey: string) => {
    if (!ppcData) return null;
    const rows = ppcData.pricing.filter(r =>
      (r.active === undefined || String(r.active).toLowerCase() === 'true') &&
      keyfy(r.module) === keyfy(moduleKey)
    );
    if (rows.length === 0) return null;

    const match = rows.find(t => {
      const min = parseInt(t.min_qty) || 0;
      const max = (t.max_qty === '' || t.max_qty === undefined) ? Infinity : parseInt(t.max_qty);
      return qty >= min && qty <= max;
    });
    if (!match) return null;

    const marginPct = parseFloat(match.margin_pct) || 0; // fraction
    let pricePerPiece = costPerPiece * (1 + marginPct);

    const floor = parseFloat(match.price_floor_per_piece);
    if (isFinite(floor) && pricePerPiece < floor) pricePerPiece = floor;

    return { tier: match.tier || '-', marginPct, pricePerPiece, totalPrice: pricePerPiece * qty };
  }, [ppcData]);

  const calculatePPC = useCallback((
    widthIn: number,
    heightIn: number,
    qty: number,
    materialKey: string,
    printMethod: PrintMethodType | 'auto', // FIX: Keep as PrintMethodType | 'auto'
    attachmentKey: string,
    packagingKey: string,
    qtyRetail: number,
    qtyPod: number,
    qtyB2B: number,
  ) => {
    if (!ppcData || !isFinite(widthIn) || !isFinite(heightIn) || widthIn <= 0 || heightIn <= 0 || !isFinite(qty) || qty <= 0) {
      setCalculationResult(null);
      return;
    }

    // FIX: Explicitly type chosenMethod to PrintMethodType to reinforce its string enum nature
    let chosenMethod: PrintMethodType = printMethod === 'auto' ? PrintMethodType.DIGITAL : printMethod;
    
    // Validate rules for the chosen method
    const rc = applyRules(chosenMethod, materialKey, widthIn, heightIn);
    if (!rc.ok) { 
        addToast(rc.reason || "Rule violation.", "error"); 
        setCalculationResult(null); 
        return; 
    }
    if (rc.fix && rc.fix.method) { chosenMethod = rc.fix.method; }

    const basis = keyfy(String(MaterialCostBasis.SHEET)); // FIX: Use String(MaterialCostBasis.SHEET)
    const wasteFactor = getCost('material_waste_factor', 1);
    const INTERNAL_STEP = getCost('internal_step', 0);
    const DISPLAY_STEP = getCost('display_step', 0.5);

    const anyActiveFmt = ppcData.print_formats.find(f => String(f.active).toLowerCase() === 'true');
    const bleed = parseFloat(anyActiveFmt?.bleed_mm || '0') || 3;
    const pieceWmm = (widthIn * 25.4) + (2 * bleed); // FIX: Ensure 2*bleed is added
    const pieceHmm = (heightIn * 25.4) + (2 * bleed); // FIX: Ensure 2*bleed is added

    // FIX: Explicitly cast arguments when calling planMixedFormats to resolve stubborn type inference issue.
    const plan = planMixedFormats(
      chosenMethod, // Ensure first argument is a string enum member
      pieceWmm as number,
      pieceHmm as number,
      qty as number,
      { objective: 'min_cost', preferSingleIfFits: true, singleSheetPremiumPct: 0.10 }
    );

    if (!plan) {
      addToast("No valid print rates for the chosen method (or size doesn't fit any format). Check print_rates/print_formats and rotation flags.", "error");
      setCalculationResult(null);
      return;
    }

    const printCostPerPiece_raw = plan.print_per_piece;

    const mm2_to_sqft = (mm2: number) => (mm2 / (25.4 * 25.4)) / 144;
    let totalSheetsAreaSqFt = 0;
    for (const line of plan.lines) {
      const fmt = line.format;
      totalSheetsAreaSqFt += line.sheets * mm2_to_sqft(parseFloat(fmt.width_mm || '0') * parseFloat(fmt.height_mm || '0')); // FIX: Add '0' default
    }
    const usedAreaPerPieceSqFt = mm2_to_sqft(pieceWmm * pieceHmm);
    const totalCapacityPieces = plan.total_capacity_pieces;
    const usedPieces = Math.min(totalCapacityPieces, qty);
    const usedAreaSqFt = usedPieces * usedAreaPerPieceSqFt;
    const wasteAreaSqFt = Math.max(0, totalSheetsAreaSqFt - usedAreaSqFt); // FIX: Corrected variable name

    const matRow = ppcData.materials.find(m => keyfy(m.material_key) === materialKey);
    const matRate = parseFloat(matRow?.rate_per_sqft || '0') || 0;
    const pieceAreaSqFt = (widthIn * heightIn) / 144;

    let materialTotal_raw: number;
    if (basis === keyfy(String(MaterialCostBasis.SHEET))) { // FIX: Use String for enum comparison
      materialTotal_raw = totalSheetsAreaSqFt * matRate;
    } else {
      const base = qty * pieceAreaSqFt * matRate;
      // FIX: The original logic for wasteA here was problematic if qty * pieceAreaSqFt was larger than totalSheetsAreaSqFt.
      // Re-evaluate to ensure waste calculation is correct based on intent.
      // If `basis` is 'piece', we might want to calculate waste based on the *actual* pieces produced vs material bought for them.
      // For simplicity, let's assume `wasteAreaSqFt` from the print plan is already accounting for efficient sheet usage.
      materialTotal_raw = base + (wasteAreaSqFt * matRate * wasteFactor);
    }
    const materialCostPerPiece_raw = materialTotal_raw / qty;

    const packRow = ppcData.packaging.find(p => keyfy(p.pack_key) === packagingKey);
    const packUnit = parseFloat(packRow?.unit_cost || '0') || 0;
    // FIX: Use parentheses to correctly group '||' and '??' operations
    const packMOQ = parseInt((packRow?.moq ?? packRow?.MOQ ?? packRow?.Moq) || '0') || 0;
    const effectivePackQty = Math.max(qty, packMOQ);
    const packTotal_raw = packUnit * effectivePackQty;
    const packPerPiece_raw = packTotal_raw / qty;

    const attach_raw = parseFloat(ppcData.attachments.find(a => keyfy(a.attach_key) === attachmentKey)?.unit_cost || '0') || 0;
    const labor_raw = getCost('labor_cost_per_piece', 3);
    const overheadPct = getCost('overhead_pct', 0);

    const rint = (x: number, step: number) => step > 0 ? Math.round(x / step) * step : x;

    let costPerPiece_raw = materialCostPerPiece_raw + printCostPerPiece_raw + attach_raw + packPerPiece_raw + labor_raw;
    costPerPiece_raw = costPerPiece_raw * (1 + overheadPct);
    const costPerPiece_internal = rint(costPerPiece_raw, INTERNAL_STEP);

    const mainPricing = priceForModule(costPerPiece_internal, qty, 'base');
    // FIX: Replaced `costPerPiece_piece` with `costPerPiece_internal` as a fallback.
    const perPiece_unrounded = mainPricing ? mainPricing.pricePerPiece : costPerPiece_internal;

    const roundTo = (x: number, step: number) => step > 0 ? Math.round(x / step) * step : x;
    const pricePerPiece_display = roundTo(perPiece_unrounded, DISPLAY_STEP);
    const totalOrder_display = roundTo(perPiece_unrounded * qty, DISPLAY_STEP);

    const utilization = totalSheetsAreaSqFt > 0 ? (usedAreaSqFt / totalSheetsAreaSqFt) * 100 : 0;

    const ppsAvg = plan.total_sheets > 0 ? (totalCapacityPieces / plan.total_sheets) : 0;

    const mixNote = plan.lines.map(l => `${l.sheets}x${keyfy(l.format.format_key).toUpperCase()} (${keyfy(l.method)})`).join(', ');
    const moqNote = (packMOQ > 0 && qty < packMOQ) ? ` • Packaging MOQ applied: ${packMOQ}` : "";

    const prRetail = qtyRetail > 0 ? priceForModule(costPerPiece_internal, Number(qtyRetail), 'retail') : null;
    const prPod = qtyPod > 0 ? priceForModule(costPerPiece_internal, Number(qtyPod), 'pod') : null;
    // FIX: Added Number() cast for qtyB2B to explicitly ensure its numeric type, addressing potential subtle TypeScript inference issues.
    const prB2B = qtyB2B > 0 ? priceForModule(costPerPiece_internal, Number(qtyB2B), 'b2b') : null;

    setCalculationResult({
      materialCostPerPiece_raw,
      printCostPerPiece_raw,
      attach_raw,
      packPerPiece_raw,
      labor_raw,
      costPerPiece_internal,
      pricePerPiece_display,
      totalOrder_display,
      utilization,
      sheetsRequired: plan.total_sheets,
      pps: Math.round(ppsAvg * 100) / 100,
      materialUsed: usedAreaSqFt,
      materialWastage: wasteAreaSqFt,
      chosenMethod: chosenMethod,
      mixNote,
      moqNote,
      tierName: mainPricing ? (mainPricing.tier || '-') : '-',
      tierMargin: mainPricing ? (mainPricing.marginPct * 100) : 0,
      pricePerPiece_retail: prRetail ? roundTo(prRetail.pricePerPiece, DISPLAY_STEP) : null,
      totalPrice_retail: prRetail ? roundTo(prRetail.totalPrice, DISPLAY_STEP) : null,
      tierRetail: prRetail ? (prRetail.tier || '-') : '-',
      marginRetail: prRetail ? (prRetail.marginPct * 100) : 0,
      pricePerPiece_pod: prPod ? roundTo(prPod.pricePerPiece, DISPLAY_STEP) : null,
      totalPrice_pod: prPod ? roundTo(prPod.totalPrice, DISPLAY_STEP) : null,
      tierPod: prPod ? (prPod.tier || '-') : '-',
      marginPod: prPod ? (prPod.marginPct * 100) : 0,
      pricePerPiece_b2b: prB2B ? roundTo(prB2B.pricePerPiece, DISPLAY_STEP) : null,
      totalPrice_b2b: prB2B ? roundTo(prB2B.totalPrice, DISPLAY_STEP) : null, // FIX: Changed totalPrice_b2B to totalPrice_b2b
      tierB2B: prB2B ? (prB2B.tier || '-') : '-',
      marginB2B: prB2B ? (prB2B.marginPct * 100) : 0,
    });
  }, [ppcData, addToast, applyRules, getCost, planMixedFormats, piecesPerSheet, priceForModule]);


  const diagnostics = useMemo<PPCDiagnostics[]>(() => {
    if (!ppcData) return [];
    const diag: PPCDiagnostics[] = [];
    for (const name of Object.keys(ppcData) as Array<keyof PPCData>) {
      const rows = (ppcData[name] || []) as any[];
      const ok = rows.length > 0;
      diag.push({
        tableName: name,
        loaded: ok,
        rows: rows.length,
        sampleColumns: ok ? Object.keys(rows[0]).slice(0, 5) : ['-'],
      });
    }
    return diag;
  }, [ppcData]);

  return {
    ppcSheetId,
    setPpcSheetId,
    ppcData,
    loading: isLoading,
    error: error?.message || null,
    initialLoadComplete: !isLoading && (!!ppcData || !!error),
    showPermissionPrompt,
    loadPPCData: () => mutate(), // Expose mutate for manual refresh
    handleGrantSheetsAccess,
    diagnostics,
    calculatePPC,
    calculationResult,
    inr,
    keyfy, // Expose keyfy for internal use in render options
  };
};