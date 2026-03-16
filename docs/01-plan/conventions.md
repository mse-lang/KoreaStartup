# Phase 2: Convention Definition
> KoreaStartup.kr Coding Standards & Architecture Rules

## 1. Naming Conventions

| Element Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| React Components | PascalCase | `NewsCard.tsx` | Standard React convention |
| Hooks | camelCase | `useAuthUser.ts` | Must start with 'use' |
| Utilities/Helpers | camelCase | `formatDate.ts` | Standard TS convention |
| Constants | UPPER_SNAKE | `MAX_ITEMS_PER_PAGE` | Easy to identify constants |
| File Names (Pages) | kebab-case or standard Next | `page.tsx`, `layout.tsx` | Next.js App Router rules |
| Types/Interfaces | PascalCase | `ArticleProfile` | Standard TS pattern |

## 2. File Structure (Next.js App Router)

```text
src/
├── app/               # App Router pages and layouts
│   ├── (auth)/        # Auth group
│   ├── api/           # Route handlers (Ingest API, Webhooks)
│   ├── globals.css    # Tailwind base
│   └── layout.tsx     # Root layout
├── components/        # Reusable UI components
│   ├── common/        # Buttons, Inputs
│   ├── layout/        # Header, Footer, Sidebar
│   └── features/      # Business logic components (e.g., NewsFeed)
├── hooks/             # Custom React Hooks
├── lib/               # 3rd party integrations (Supabase client, Toss)
├── types/             # Shared TypeScript types corresponding to Supabase
└── utils/             # Helper functions (formatting, parsing)
```

## 3. Tech Stack Conventions
* **Framework**: Next.js 14+ (App Router). Server Components prioritized for SEO.
* **Styling**: Tailwind CSS + custom glassmorphism variants in globals.css.
* **Database**: Supabase SDK (`@supabase/ssr`).
* **Fonts**: Pretendard (Primary).

## 4. Git Commit Guidelines (Conventional Commits)

Format: `type(scope?): subject`

```text
feat     : A new feature (e.g., feat: Add Toss payment widget)
fix      : A bug fix (e.g., fix: Resolve RLS policy issue)
docs     : Documentation only changes
style    : Changes that do not affect the meaning of the code (formatting)
refactor : A code change that neither fixes a bug nor adds a feature
test     : Adding missing tests or correcting existing tests
chore    : Changes to the build process or auxiliary tools
```

## 5. Code Style
* **Strict TypeScript**: `any` usage is prohibited unless absolutely necessary with lint suppression.
* **Linting**: ESLint + Prettier enabled.
* **Line length**: Max 100 characters.
* **Quotes**: Single quotes preferred for TS strings, double quotes for JSX attributes.

## Next Phase
Proceeding to Phase 3: Mockup (Bento Grid Dashboard Layout).
