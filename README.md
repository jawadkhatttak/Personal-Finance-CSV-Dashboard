# 💰 Personal Finance CSV Dashboard

A privacy-first finance tracker that runs entirely in your browser.
Drop your bank's CSV export and get instant spending insights —
no server, no account, no data ever leaves your machine.

## Live Demo
[View Demo]([https://YOUR-USERNAME.github.io/REPO-NAME](https://jawadkhatttak.github.io/Personal-Finance-CSV-Dashboard/))

## Features
- Drag-and-drop CSV ingestion via the Browser File API
- Automatic transaction classification using a rules-based engine
- Spending breakdown by category (doughnut chart)
- Monthly spending trend (bar chart)
- Searchable, filterable transaction table
- Manual category override with localStorage persistence across sessions

## Technical Decisions

**Why client-side only?**
Bank transaction data is sensitive. Running everything in the browser
means zero server infrastructure, zero data liability, and zero privacy
risk. localStorage handles persistence without a database.

**Why a rules-based classifier over ML?**
Rules are transparent and debuggable. A user can see exactly why
"NETFLIX" maps to Entertainment. An ML model would be a black box
for marginal accuracy gain on structured bank descriptions.

**Why PapaParse instead of manual CSV splitting?**
Real bank exports contain quoted fields with commas, Windows line
endings, and UTF-8 BOM characters. Manual splitting breaks on all
three. PapaParse handles every edge case correctly.

## Stack
HTML · CSS · Vanilla JS · Chart.js · PapaParse · Browser File API

## How to Use
1. Export a CSV from your bank (most banks support this)
2. Open the live demo
3. Drag and drop your CSV onto the upload zone
4. Click any category to override the automatic classification
