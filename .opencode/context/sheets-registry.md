# Sheets Registry Reference

Verified by probing all sheet IDs via Google Sheets API on 2026-04-29. Service account used: `gen-lang-client-0910892311-9c5f454b53f7.json`.

## Spreadsheet Workbook

| Env Var | Sheet ID | Title | Status | Tabs |
|---------|----------|-------|--------|------|
| `GOOGLE_SHEETS_ID` | `1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A` | CRM - Core | ✅ OK | 13: config, INBOX_FIELD_MAPPING, Sources, Leads, LEAD_FLOWS, FLOW_DETAILS, PARTNER_LIFECYCLE, Sheet19, Accounts, SYSTEM_USERS, RBAC_ROLES, Modules, Sheet17 |
| `EXECUTION_SPREADSHEET_ID` | `156rACoJheFPD4lftBrvVqXScxDp1y8d3msB1tFWbEAc` | (unknown) | ❌ No permission | Service account not granted access. |
| `APP_LOGGING_SPREADSHEET_ID` | `1wvjgA8ESxxn_hl86XeL_gOecDjSYPgSo6qyzewP-oJw` | YD - App | ✅ OK | 10: MASTER_SCHEMA, mani, App, _MANIFEST, Shortcuts, Master drive access, ROLES, Architecture, BrainDump, Login |
| `BMC_SPREADSHEET_ID` | `1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs` | YDC - Business model canvas | ✅ OK | 20: _MANIFEST, 📊 DASHBOARD, _config, VALUE_Proposition, CUSTOMER_RELATIONSHIPS, KEY RESOURCES, KEY ACTIVITIES, channels, partners, cost_structure, revenue_streams, segments, business_units, flywheels, _BMC_NAMED_RANGES, platforms, team, hubs, metrics, gaps_actions |
| `CRM_CONFIG_SPREADSHEET_ID` | `1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4` | CRM - Configuration & Metadata | ✅ OK | 16: journey mapping, Sheet11, Sheet map, Sheet15, Product Range, LEGEND, Sheet19, ROUTING_RULES, Sheet16, FLOW_TYPE_CONFIG, SLA_RULES, STAGE_PROMPTS, SUGGESTED_NEXT_ACTIONS, AUTO_PROGRESSION_RULES, MESSAGE_TEMPLATES, APP_SETTINGS |
| `CRM_FLOWS_SPREADSHEET_ID` | `1NWuPxl8WeFTSoYgzHrfgLoPXcMkqfsffvspTFTIJ5hE` | CRM - Flows | ✅ OK | 3: LEAD_TO_ACCOUNT_MAP, Store, B2B |
| `OPS_INVENTORY_SPREADSHEET_ID` | `1C14oNmZt6AbjPbrUMdfDfcGRHjDk0YRZAkUIb0Fnb3s` | YDS inventory | ✅ OK | 9: Product Type, Product Classification, Products Inventory, Vendors, PO_List, PO_PRINT_TEMPLATE, Warehouse products, Categorised, Column mapping |
| `OPS_SALES_SPREADSHEET_ID` | `1c3dmxzD5Ur3WzEfqf_VR1gBkB_tMzW7zP5UhUmYf1q0` | YDS Sales - inventory | ✅ OK | 6: Sales- Orders + Products, Products (template), Product Classifciation, Pivot - product Color, Pivot - product Size, pivot - order type - product |
| `OPS_PRODUCTS_SPREADSHEET_ID` | `1fLqcph7QGa1Bby8-C1eT6m7ov0kcoyl4yb6x5Sr_gPc` | YDS Products | ✅ OK | 5: Product Variants, Products (template), Product Type, Classification, Website products |
| `OPS_WAREHOUSE_SPREADSHEET_ID` | `1OFea7HWaz4u1_mUGO6UEGYedmO1TyjpR_K7BzMJnlf0` | YDS Warehouse layout | ✅ OK | 6: Warehouse Master, Product Code Master, Color Code Master, Bin Location Master (Main Sheet), Size Slot Template, Inventory |
| `DAILY_SALES_SPREADSHEET_ID` | `1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A` | YDC - sales report | ✅ OK | 10: April 2026, 2027, 2026, Customer_Rollup, legend, Channel_Economics, Geographic, KPI_Dashboard, Monthly preview, Customer_Summary |
| `COMPETITOR_INTEL_SPREADSHEET_ID` | `1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI` | Competitors | ✅ OK | 12: Competitors_Master, Competitor analysis, Competitor_Positioning, Competitor_Notes, Competitor_Capabilities, Competitor_UX_Product, Competitor_Messaging, Competitor_SWOT, Copy of Competitor_Philosophy, Copy of Competitor_MomentsOfTruth, Copy of Competitor_StealAdaptAvoid, Copy of Competitor_Watchlist |
| `GOOGLE_ADS_SPREADSHEET_ID` | `1zJVYckVMX0VBcwgr7VBzkYZ8dSrMPHoDmgpQaRlzH1s` | Google ads - reporting | ✅ OK | 4: Dashboard, Data_Crunching, Raw_Data, Raw_Search_Terms |

## External Google Ads Sheets (not wired to app — offline reference only)

| Sheet | ID | Title | Tabs |
|-------|----|-------|------|
| Analysis | `1De0fPrjU7r02MW-96i2Mr-9Cfjv-Svvpz2JvDFESCtM` | Google ads - analysis | 15: campaign_L30, ad_to_lp_map, negative_keywords_all, search_is_L30, keywords_L30, search_terms_L30, ads_L30, landing_pages_L30, campaign_device_network_L30, campaign_geo_L30, neg_keywords_campaign, neg_keywords_ad_group, conversion_actions_L30, rsa_assets_L30, quality_score_keywords |
| History | `1ATbAVLiFpbNsc9Op2KSDbwPSAxSrTj4Aa9o2V3FWWmk` | Google ads history | 6: campaign_6Q, ads_6Q, landing_pages_6Q, negative_keywords_all, keywords_6Q, search_terms_6Q |

## Registered Tabs (SHEET_REGISTRY in `server/services/sheets.js`)

These are the tabs used by the Command Centre frontend. Each maps to a registry key, spreadsheet, and sheet name.

### Execution
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `PROJECTS` | EXECUTION | PROJECTS | 784960017 |
| `TASKS` | EXECUTION | TASKS | 268128158 |
| `PEOPLE` | EXECUTION | PEOPLE & CAPACITY | 40806932 |
| `CAMPAIGNS` | EXECUTION | CAMPAIGNS | 2052586943 |
| `EXECUTIVE_DASHBOARD` | EXECUTION | EXECUTIVE DASHBOARD | 1902780278 |
| `TIME_TRACKING` | EXECUTION | TIME TRACKING | 1450207772 |

### Strategy
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `BUSINESS_UNITS` | STRATEGY | BUSINESS UNITS | 0 |
| `FLYWHEEL` | STRATEGY | Flywheel | 225662612 |
| `HUBS` | STRATEGY | Hub | 1390706317 |
| `CUSTOMER_SEGMENT` | STRATEGY | Customer Segment & foundation | 1469082015 |
| `TOUCHPOINTS` | STRATEGY | TOUCHPOINTS | 1839538407 |
| `APP_STORES` | STRATEGY | APP STORES | 1447819195 |

### App Logging
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `LOGIN` | APP_LOGGING | Login | 288121377 |
| `BRAIN_DUMP` | APP_LOGGING | BrainDump | 0 |

### CRM Core
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `CRM_LEADS` | CRM_CORE | Leads | — |
| `CRM_LEAD_FLOWS` | CRM_CORE | LEAD_FLOWS | — |
| `CRM_FLOW_DETAILS` | CRM_CORE | FLOW_DETAILS | — |
| `CRM_ACCOUNTS` | CRM_CORE | Accounts | — |
| `CRM_PARTNER_LIFECYCLE` | CRM_CORE | PARTNER_LIFECYCLE | — |
| `CRM_SOURCES` | CRM_CORE | Sources | — |
| `CRM_SYSTEM_USERS` | CRM_CORE | SYSTEM_USERS | — |

### CRM Config
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `CRM_SLA_RULES` | CRM_CONFIG | SLA_RULES |
| `CRM_ROUTING_RULES` | CRM_CONFIG | ROUTING_RULES |
| `CRM_STAGE_PROMPTS` | CRM_CONFIG | STAGE_PROMPTS |
| `CRM_SUGGESTED_ACTIONS` | CRM_CONFIG | SUGGESTED_NEXT_ACTIONS |
| `CRM_MESSAGE_TEMPLATES` | CRM_CONFIG | MESSAGE_TEMPLATES |
| `CRM_FLOW_TYPE_CONFIG` | CRM_CONFIG | FLOW_TYPE_CONFIG |
| `CRM_PRODUCT_RANGE` | CRM_CONFIG | Product Range |
| `CRM_APP_SETTINGS` | CRM_CONFIG | APP_SETTINGS |

### CRM Flows
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `CRM_LEAD_TO_ACCOUNT` | CRM_FLOWS | LEAD_TO_ACCOUNT_MAP |
| `CRM_STORE` | CRM_FLOWS | Store |
| `CRM_B2B` | CRM_FLOWS | B2B |

### BMC
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `BMC_SEGMENTS` | BMC | segments | 1306312699 |
| `BMC_BUSINESS_UNITS` | BMC | business_units | 1781583811 |
| `BMC_FLYWHEELS` | BMC | flywheels | 1180180195 |
| `BMC_REVENUE_STREAMS` | BMC | revenue_streams | 1625184466 |
| `BMC_COST_STRUCTURE` | BMC | cost_structure | 1493870932 |
| `BMC_CHANNELS` | BMC | channels | 715227562 |
| `BMC_PLATFORMS` | BMC | platforms | 1300146116 |
| `BMC_TEAM` | BMC | team | 1710233820 |
| `BMC_HUBS` | BMC | hubs | 906330339 |
| `BMC_PARTNERS` | BMC | partners | 898629063 |
| `BMC_METRICS` | BMC | metrics | 439308533 |

### Ops Inventory
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `OPS_PRODUCT_TYPES` | OPS_INVENTORY | Product Type |
| `OPS_PRODUCT_CLASSIFICATION` | OPS_INVENTORY | Product Classification |
| `OPS_PRODUCTS_INVENTORY` | OPS_INVENTORY | Products Inventory |
| `OPS_VENDORS` | OPS_INVENTORY | Vendors |
| `OPS_PO_LIST` | OPS_INVENTORY | PO_List |
| `OPS_WAREHOUSE_PRODUCTS` | OPS_INVENTORY | Warehouse products |

### Ops Sales
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `OPS_SALES_ORDERS` | OPS_SALES | Sales- Orders + Products |
| `OPS_SALES_PRODUCT_CLASS` | OPS_SALES | Product Classifciation |

### Ops Products
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `OPS_PRODUCT_VARIANTS` | OPS_PRODUCTS | Product Variants |
| `OPS_PRODUCT_TYPE_MASTER` | OPS_PRODUCTS | Product Type |

### Ops Warehouse
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `OPS_WAREHOUSE_ZONES` | OPS_WAREHOUSE | Warehouse Master |
| `OPS_WAREHOUSE_BINS` | OPS_WAREHOUSE | Bin Location Master (Main Sheet) |
| `OPS_WAREHOUSE_COLORS` | OPS_WAREHOUSE | Color Code Master |
| `OPS_PRODUCT_CODE_MASTER` | OPS_WAREHOUSE | Product Code Master |

### Daily Sales
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `SALES_YTD` | DAILY_SALES | (dynamic: FY end-year) | null |
| `SALES_LAST_FY` | DAILY_SALES | (dynamic: prior FY end-year) | null |
| `SALES_CURRENT_MONTH` | DAILY_SALES | (dynamic: Month YYYY) | null |

### Competitor Intel
| Key | Spreadsheet | Sheet |
|-----|-------------|-------|
| `CI_COMPETITORS` | COMPETITOR_INTEL | Competitors_Master |
| `CI_ANALYSIS` | COMPETITOR_INTEL | Competitor analysis |
| `CI_POSITIONING` | COMPETITOR_INTEL | Competitor_Positioning |
| `CI_NOTES` | COMPETITOR_INTEL | Competitor_Notes |
| `CI_CAPABILITIES` | COMPETITOR_INTEL | Competitor_Capabilities |
| `CI_UX_PRODUCT` | COMPETITOR_INTEL | Competitor_UX_Product |
| `CI_MESSAGING` | COMPETITOR_INTEL | Competitor_Messaging |
| `CI_SWOT` | COMPETITOR_INTEL | Competitor_SWOT |
| `CI_PHILOSOPHY` | COMPETITOR_INTEL | Copy of Competitor_Philosophy |
| `CI_MOMENTS` | COMPETITOR_INTEL | Copy of Competitor_MomentsOfTruth |
| `CI_STEAL_ADAPT` | COMPETITOR_INTEL | Copy of Competitor_StealAdaptAvoid |
| `CI_WATCHLIST` | COMPETITOR_INTEL | Copy of Competitor_Watchlist |

### Google Ads (added 2026-04-29)
| Key | Spreadsheet | Sheet | GID |
|-----|-------------|-------|-----|
| `GOOGLE_ADS_DASHBOARD` | GOOGLE_ADS | Dashboard | 1627554479 |
| `GOOGLE_ADS_CRUNCHING` | GOOGLE_ADS | Data_Crunching | 1608352041 |
| `GOOGLE_ADS_RAW` | GOOGLE_ADS | Raw_Data | 592899582 |
| `GOOGLE_ADS_SEARCH_TERMS` | GOOGLE_ADS | Raw_Search_Terms | 620800794 |

## Notes
- **Execution sheet** (`EXECUTION_SPREADSHEET_ID`) needs service account access granted — currently returns 403.
- **Analysis & History** Google Ads sheets are NOT wired to the app. They're offline reference copies.
- All dynamic tab names (Daily Sales) resolve via `resolveSheetName()` at request time using IST-shifted dates.
- Sheet data cached in-memory for 5 minutes (see `sheets.js`).