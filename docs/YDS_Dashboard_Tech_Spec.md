# YDS Google Ads Dashboard — Technical Specification

**Project:** Google Ads Performance Dashboard  
**Prepared by:** Danish Hanif  
**For:** Engineering / Frontend Dev  
**Data source:** Google Sheets (already connected to dashboard)  
**Status:** Spec only — build from scratch

---

## 1. Overview

Replace the current basic dashboard UI with a structured, tabbed analytics interface. The dashboard reads from an existing Google Sheets data source with four tables: `Raw_Data`, `Raw_Search_Terms`, `Data_Crunching`, and `Dashboard`.

No backend changes required. All data comes from the existing Sheets connection.

---

## 2. Data Schema Reference

### 2.1 Raw_Data (2,217 rows, 11 cols)
| Column | Type | Notes |
|---|---|---|
| `segments.date` | date | YYYY-MM-DD |
| `campaign.name` | string | |
| `ad_group.name` | string | |
| `segments.device` | string | DESKTOP / MOBILE / TABLET |
| `metrics.impressions` | integer | |
| `metrics.clicks` | integer | |
| `metrics.cost_micros` | integer | Divide by 1,000,000 for ₹ |
| `metrics.conversions` | float | |
| `metrics.conversions_value` | float | Currently ₹0 — tracking broken |
| `metrics.search_impression_share` | float | |

### 2.2 Raw_Search_Terms (1,196 rows, 5 cols)
| Column | Type | Notes |
|---|---|---|
| `search_term_view.search_term` | string | |
| `campaign.name` | string | |
| `metrics.clicks` | integer | |
| `metrics.cost_micros` | integer | Divide by 1,000,000 |
| `metrics.conversions` | float | |

### 2.3 Data_Crunching (3,143 rows, 12 cols)
Pre-processed table. Use this as primary source for dashboard calculations.

| Column | Type | Notes |
|---|---|---|
| `Date` | date | |
| `Campaign` | string | |
| `Ad Group` | string | |
| `Impressions` | integer | |
| `Clicks` | integer | |
| `Real Cost` | float | Already converted from micros |
| `Conversions` | float | |
| `Revenue` | float | Currently ₹0 — tracking broken |
| `CPA` | float | Cost / Conversions |
| `ROAS` | float | Revenue / Cost — currently 0 |

### 2.4 Dashboard (summary table)
Pre-aggregated. Use for Campaign Performance and Daily Pacing sections. Structure: multiple named sections arranged side-by-side in the sheet.

---

## 3. Layout

### 3.1 Structure
```
┌─────────────────────────────────────────────────────────┐
│ HEADER — title, sync time, status pills                  │
├─────────────────────────────────────────────────────────┤
│ TAB BAR — Overview | Campaigns | Search Terms | Funnel   │
├──────────────────────────────┬──────────────────────────┤
│ MAIN CONTENT (tab-driven)    │ ADVISORY SIDEBAR (fixed) │
│                              │ 280px wide               │
└──────────────────────────────┴──────────────────────────┘
```

### 3.2 Header
- Left: title "YDS Google Ads Dashboard"
- Right: "Last sync: [timestamp]" pulled from sheet
- Status pills (always visible):
  - If `Revenue = 0` → red pill "₹0 ROAS — Tracking Broken"
  - Count of P0 issues pending → amber pill "P0: N fixes pending"

### 3.3 Tab Bar
Four tabs: **Overview**, **Campaigns**, **Search Terms**, **Funnel**  
Active tab: highlighted with accent color underline. Default: Overview.

### 3.4 Advisory Sidebar (280px, fixed right)
Always visible regardless of active tab.

Contains:
1. **Panel advisory cards** — 5 static insight cards (content below in §7)
2. **Action queue** — ordered list of pending tasks with priority badges (P0/P1/P2)
3. **Date range selector** — buttons: 7 Days | 14 Days | 30 Days | All. Selection filters all main content.

---

## 4. Tab: Overview

### 4.1 KPI Row (4 cards)
Aggregate from `Data_Crunching` filtered by selected date range.

| Card | Value | Sub-label |
|---|---|---|
| Total Spend | `SUM(Real Cost)` formatted as ₹X.XK | "₹X/day avg" |
| Clicks | `SUM(Clicks)` formatted as X.XL if >100k | "CPC ₹X.XX" |
| Conversions (reported) | `SUM(Conversions)` | "Note: includes fake conv" |
| Revenue | `SUM(Revenue)` | If 0: "Tracking failure" in red |

> **Note:** Show a persistent banner beneath KPIs if Revenue = 0: "Revenue tracking is broken. Nirmal's P0 task (dataLayer push) must ship before ROAS is meaningful."

### 4.2 Status Table
Static truth table — not data-driven. Always show these rows:

| Signal | Status | What it means |
|---|---|---|
| Reported conversions | JUNK | Map clicks, calls — moved to Secondary |
| ₹0 revenue | BROKEN | No dataLayer.push on /checkout/success |
| 96% checkout drop | REAL | Login wall — losing ~3x revenue |
| Competitor clicks | SIGNAL | Printrove/Printful/Printify — high-intent audience |
| Brand term clicks | REAL | "your design store" — cheapest CPA |

Status pill colors: JUNK=red, BROKEN=amber, REAL=red or green (context), SIGNAL=green.

### 4.3 Daily Spend Chart
- Type: Bar chart
- X-axis: Date
- Y-axis: ₹ spend (from `Real Cost` in `Data_Crunching`)
- Filtered by date range selector
- Color: single accent color bar

### 4.4 Conversion Breakdown Chart
- Type: Donut chart
- Static data (from audit findings):
  - Map/call clicks (fake): 762
  - Store visits (fake): 52
  - Other fake: 28
  - Real purchases: 2
- Label each segment. Show legend below chart.
- Note below chart: "Fake conversion data cleaned up Feb 21. Real purchase tracking rebuilding."

---

## 5. Tab: Campaigns

### 5.1 Campaign Performance Table
Source: `Dashboard` sheet, "Campaign Performance (Last 30 Days)" section — or aggregate from `Data_Crunching` grouped by `Campaign`.

Columns: **Grade** | **Campaign** | **Impressions** | **Clicks** | **Spend** | **Conv** | **CPA** | **ROAS** | **Verdict**

**Grading logic (auto-calculated):**
| Grade | CPA Threshold | Badge color |
|---|---|---|
| A+ | < ₹10 | Green |
| A | ₹10–₹20 | Green |
| B | ₹20–₹30 | Blue/amber |
| C | ₹30–₹50 | Amber |
| F | > ₹50 or no conv | Red |

**Verdict logic:**
- Grade A/A+: "SCALE NOW"
- Grade B: "MONITOR"
- Grade C: "OPTIMIZE"
- Grade F: "PAUSE / REVIEW"

**Current campaigns for reference:**
| Campaign | Spend | Clicks | Conv | CPA | Grade |
|---|---|---|---|---|---|
| YourDesign Search – Google Build | ₹49,479 | 2.9L | 1,204 | ₹41.10 | C |
| Corporate Gifting | ₹9,978 | 65,017 | 417 | ₹23.93 | B |
| YDC Shopping Ad 26 | ₹797 | 42,578 | 60 | ₹13.28 | A |
| Product Search 2026 | ₹167 | 1,240 | 28 | ₹5.96 | A+ |

### 5.2 CPA Comparison Chart
- Type: Horizontal bar chart
- X-axis: CPA in ₹
- Y-axis: Campaign names
- Color bars by grade: green for A/A+, amber for B/C, red for F
- Sort: lowest CPA at top

### 5.3 Budget Allocation Visual
Two side-by-side horizontal stacked bars:

**Current allocation:**
- Calculate each campaign's % of total spend from `Data_Crunching`
- Color bars by campaign grade

**Recommended allocation:**
- Static/advisory — not data-driven
- Best performers (A/A+): 40%
- B2B / Corporate: 35%
- Reduced search: 25%
- Label each segment with %

Add note: "Recommendation based on CPA performance. Review after purchase tracking is live."

---

## 6. Tab: Search Terms

### 6.1 Search Terms Table
Source: `Raw_Search_Terms`, aggregated by `search_term_view.search_term`.

Columns: **Search Term** | **Type** | **Clicks** | **Spend** | **Conv** | **CPC** | **Signal**

**Type classification logic** (keyword match):
- If term matches known brand name (`your design store`, `yourdesignstore`, `yds`): Type = "BRAND" (green pill)
- If term matches known competitor (`printful`, `printify`, `printrove`, `teespring`, `qikink`): Type = "COMPETITOR" (red pill)
- Else: Type = "GENERIC" (gray pill)

**Signal logic:**
- Competitor term with Conv > 30: "High intent"
- Brand term (any): "Scale brand"
- CPA < ₹15: "Low cost win"
- Conv = 0 and Spend > ₹500: "Pause / review"

Sort default: Conv descending. Allow column header click to re-sort.

### 6.2 Conversion Volume Bar Chart
Horizontal bar chart showing top 10 search terms by Conversions.  
Color: green for brand terms, amber for competitor terms, gray for generic.  
Pull from `Raw_Search_Terms`.

### 6.3 Insight Panel
Static text block beneath the chart:

> "Competitor terms (Printrove, Printify, Printful) are generating conversions at low CPAs from users actively comparing POD providers. Recommended: build dedicated landing pages for competitor switchers highlighting YDS's 48-hour turnaround, no minimums, and India-based production."

---

## 7. Tab: Funnel

### 7.1 Funnel Visualization
Static data from GA4 audit (Feb 19–21, 2026). Not connected to live data yet — hardcode these values until GA4 integration is available.

| Stage | Event | Users | Drop-off |
|---|---|---|---|
| Visit | page_view | 1,180 | — |
| View Product | view_item | 726 | -38% |
| Enter Design Tool | customizer_tool_click | 291 | -60% |
| Add to Cart | combined ATC | 99 | -66% |
| Begin Checkout | begin_checkout | 29 | -71% |
| **Shipping Info** | **add_shipping_info** | **7** | **-96% ← LOGIN WALL** |
| Payment | add_payment_info | 4 | -43% |
| Purchase | purchase | 5 | -37% |

**Rendering:**
- Horizontal bar per stage. Bar width proportional to users (% of 1,180).
- Color: accent blue for early stages → amber as drop increases → red for Login Wall stage.
- Login Wall row: highlighted with red left-border and background tint. Label clearly: "LOGIN WALL — 96% drop".
- Show drop-off % badge on right of each row.

### 7.2 Revenue Recovery Model
Side-by-side stat cards:

| | Current | Estimated (guest checkout) |
|---|---|---|
| Orders per 3 days | 5 | 15–20 |
| Basis | Actual (tracked) | 3x–4x uplift assumption |

Add note: "Removing the login wall is the single highest-leverage change in the D2C funnel. No additional ad spend required."

### 7.3 Fix Priority Callout
Styled callout box (green left-border):

> **Nirmal → guest checkout first.** This one change, at current ad spend, should 3x D2C revenue. Every other optimization is noise until this is live.

---

## 8. Advisory Sidebar Content

Static content — not data-driven.

### 8.1 Advisory Cards
Five cards, each with: expert name, color-coded left border, short insight text.

| Expert | Border Color | Insight |
|---|---|---|
| Neil Patel | Red | "Your CPA is meaningless until tracking is fixed. Ship Nirmal's dataLayer task first." |
| Gary Vee | Amber | "Printrove searchers are warm. Build a comparison landing page this week." |
| Seth Godin | Purple | "96% abandon at login. You're not losing buyers — you're refusing to sell to them." |
| Brian Chesky | Blue | "Product Search 2026 at ₹5.96 CPA is your signal. Scale it 5x before touching anything else." |
| Dominic Barton | Green | "Two moves with max impact: (1) guest checkout = 3x revenue free, (2) reallocate budget from C-grade to A-grade campaigns." |

### 8.2 Action Queue
Ordered list with priority badges:

| Priority | Action |
|---|---|
| P0 | dataLayer push on /checkout/success — Nirmal |
| P0 | Enable guest checkout — Nirmal |
| P1 | Scale Product Search 2026 — shift budget from YourDesign Search |
| P1 | Competitor landing page for Printrove/Printify switchers |
| P2 | Add Google Ads Purchase conversion tag in GTM |

---

## 9. Date Range Filter

Global selector in sidebar: **7 Days | 14 Days | 30 Days | All**

- Applies to: KPI cards, Daily Spend chart, Campaign table, Search Terms table
- Does NOT apply to: Funnel tab (static GA4 data), Advisory sidebar, Status table
- Default: All
- Implementation: filter `Data_Crunching` by `Date` column based on selection relative to today, or to max date in sheet if real-time not available

---

## 10. Formatting Rules

| Metric | Format |
|---|---|
| Spend / Revenue | ₹X,XXX or ₹XX.XK for >10,000 |
| CPC / CPA | ₹X.XX (2 decimal places) |
| Clicks > 100,000 | X.XL (e.g., 2.9L, 4.0L) |
| ROAS | X.XXx (e.g., 1.35x) — show "N/A" if Revenue = 0 |
| Conversion rate | X.XX% |
| Drop-off % | -XX% with sign |
| Dates | D/M/YYYY |

---

## 11. Color / Status Conventions

| Meaning | Color |
|---|---|
| Good / Scale | Green |
| Caution / Monitor | Amber |
| Bad / Pause | Red |
| Informational | Blue |
| Broken / Tracking failure | Red pill with "BROKEN" label |
| P0 badge | Red background |
| P1 badge | Amber background |
| P2 badge | Blue background |

---

## 12. What NOT to Build Yet

- No GA4 live integration — funnel data is hardcoded from Feb 19–21 audit
- No revenue/ROAS charts — data is ₹0 until Nirmal ships dataLayer fix
- No retargeting audience size — audiences are still building
- No automated grading changes — CPA thresholds are manual until purchase tracking is live

Once Nirmal's P0 tasks are complete, revisit: ROAS column in campaign table, revenue KPI card, and funnel data connection.

---

*YourDesignStore — Internal. Prepared May 2026.*
