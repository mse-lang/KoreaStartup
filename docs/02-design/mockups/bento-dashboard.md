# Phase 3: Bento Grid Dashboard Mockup
> KoreaStartup.kr UI/UX Prototypes & Wireframes

## 1. Global Layout (Bento Grid)
The application uses a grid-based "Bento" layout. Elements are structured as rounded glassmorphism cards.

```text
┌────────────────────────────────────────────────────────┐
│ [Logo: KoreaStartup]       [Search]       [Login/User] │
├────────────────────────────────────────────────────────┤
│                  │                                     │
│  [Hero Story]    │  [Live Ticker: Funding News]        │
│(gemini-3.1-flash-lite-preview)│────────────────────────│
│                  │  [Card 1: K-Startup] [Card 2]       │
├──────────────────│  (5-line snippet)    (5-line snip)  │
│ [Trending Tags]  │                                     │
│ #AI #SaaS #Toss  │─────────────────────────────────────│
│                  │  [Card 3]            [Card 4]       │
└────────────────────────────────────────────────────────┘
```

## 2. Component Mockups (Glassmorphism Concept)

### 2.1 News Card (Bento Item)
```html
<div class="bento-card backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 flex flex-col gap-4">
  <div class="flex justify-between items-center text-sm text-gray-400">
    <span>VentureSquare</span>
    <span>2 mins ago</span>
  </div>
  <h3 class="text-xl font-bold font-pretendard">Toss secures $100M Series G funding</h3>
  <ul class="list-disc pl-5 text-gray-300">
    <li>Led by Sequoia Capital.</li>
    <li>Valuation hits $8B.</li>
    <li>Plans to expand to Southeast Asia.</li>
    <li>Focus on AI-driven credit scoring.</li>
    <li>IPO expected late 2026.</li>
  </ul>
  <div class="mt-auto flex justify-between items-center">
    <div class="flex gap-2">
      <span class="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs">#Fintech</span>
    </div>
    <a href="..." class="text-sm font-semibold hover:underline">Original Source ↗</a>
  </div>
  
  <!-- OG Preview Trigger Area -->
  <div class="og-preview-container text-xs text-gray-500">
    Hover for full article preview...
  </div>
</div>
```

## 3. User Flows

### 3.1 Content Consumption Flow
`Home` → `View Bento Card (5-lines)` → `Hover for OG Preview` → `Click "Original Source"` → `(External Site)`

### 3.2 Community Interaction Flow (Expert)
`Home` → `Click Article` → `Open Feedback Modal` → `Select Tag (e.g., "Counter-argument")` → `Write Analysis` → `Submit`

### 3.3 Monetization Flow (User paying to view Expert Insights)
`View Feedback` → `Locked Content "Premium Insight"` → `Click "Unlock"` → `Toss Payments Widget` → `Success` → `View Content`

## Next Phase
Proceeding to Phase 4: API (Backend integrations for News Ingestion and Payments).
