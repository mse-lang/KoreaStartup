# Task Allocation: Agent 2 - Data Pipeline & AI Agent
<!-- 업무 할당: 에이전트 2 - 데이터 파이프라인 및 AI 에이전트 -->

## Role Description
Agent 2 focuses on automated data acquisition and AI processing.
<!-- 역할 설명: 에이전트 2는 자동화된 데이터 수집 및 AI 가공에 집중합니다. -->

## Assigned Tasks
<!-- 할당된 업무 -->
- [ ] **Multi-Source Crawler & Content Prioritization**: 
    - Implement **VentureSquare API** as the primary/master source (Priority 1).
    - Implement **Public Data Portal** & Gov sites (Priority 2).
    - Implement a **De-duplication & Prioritization Engine**:
        - Automatically select VentureSquare as the primary content if duplicates are found.
        - Ensure source composition (VS 40%+, Gov 40%+).
    - Implement **Source Filter**: 
        - Block `TheVC`, `StartupRecipe`.
        - Add mandatory cross-check flags for `Wowtale`, `Platum`.
<!-- 다중 소스 수집 및 우선순위 엔진: 벤처스퀘어 최우선(40%+), 정부 데이터(40%+) 비중을 유지하며 중복 시 벤처스퀘어 선택. 신뢰할 수 없는 소스(TheVC, 스타트업레시피) 차단 및 교차 검증 필터를 구현합니다. -->
- [ ] **AI Snippet Pipeline (gemini-3.1-flash-lite-preview)**: 
    - Implement **Jina Reader (r.jina.ai)** integration for raw text extraction.
    - Generate concise **5-line summaries** tailored for entrepreneurs.
    - **CRITICAL**: All summaries and metadata MUST be explicitly translated and stored in Korean (ko-KR), regardless of whether the source material is in English, Japanese, or any other foreign language.
    - Extract meta tags and generate rich link snippets.
<!-- AI 스니펫 파이프라인 (gemini-3.1-flash-lite-preview): Jina Reader 연동 본문 추출, 창업자 맞춤형 5줄 핵심 요약, 및 리치 링크 스니펫 정보 추출을 구현합니다. -->
- [ ] **Compliance Out-links**: Ensure every snippet includes an "Original Source" link to avoid copyright issues.
<!-- 컴플라이언스 아웃링크: 저작권 문제 방지를 위해 모든 스니펫에 "원문 보기" 링크를 포함합니다. -->
- [ ] **AI Editor Optimization**: Automatically restructure H1/H2/H3 tags and optimize URL slugs.
<!-- AI 에디터 최적화: H1/H2/H3 태그를 자동으로 재구성하고 URL 슬러그를 최적화합니다. -->

## Key Considerations
<!-- 주요 고려 사항 -->
- **Model Routing**: Use `gemini-3.1-flash-lite-preview` for high-volume summarization.
<!-- 모델 라우팅: 대량 요약 작업에 gemini-3.1-flash-lite-preview를 사용합니다. -->
- **SEO & AIEO**: Search engine optimization for both humans and AI crawlers.
<!-- SEO & AIEO: 인간과 AI 크롤러 모두를 위한 검색 엔진 최적화. -->
