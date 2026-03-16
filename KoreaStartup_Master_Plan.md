# [KoreaStartup.kr] Project Master Plan & AI Development Core Guidelines
<!-- [KoreaStartup.kr] 프로젝트 마스터 플랜 및 AI 개발 핵심 지침서 -->

## 1. Project Overview
<!-- 1. 프로젝트 개요 -->
* **Project Name**: KoreaStartup (코리아스타트업)
<!-- 프로젝트명: KoreaStartup (코리아스타트업) -->
* **Domain**: KoreaStartup.kr
<!-- 도메인: KoreaStartup.kr -->
* **Objective**: A news platform that curates startup news from sources like VentureSquare, optimized for Google SEO and AIEO (AI Search Engine Optimization) via an AI Editor.
<!-- 목적: 벤처스퀘어(VentureSquare)를 소스로 하여 국내외 스타트업 뉴스를 큐레이션하고, AI 에디터를 통해 구글 SEO 및 AIEO(AI 검색 최적화)에 맞춰 기사를 재가공하여 제공하는 뉴스 플랫폼. -->
* **Design Principles**: Maintain category consistency with VentureSquare, but build a unique and sophisticated UI/UX (Bento Grid) entirely different from the source. Logos are automatically generated via AI.
<!-- 디자인 원칙: 카테고리 구성과 본문 데이터는 벤처스퀘어와 동일하게 유지하되, UI/UX 및 전체 디자인은 벤처스퀘어와 전혀 다른 독자적이고 세련된 형태(Bento Grid)로 구축한다. 로고는 AI를 통해 자동 생성 및 등록한다. -->

## 2. AI Operational Principles (Long-term Memory)
<!-- 2. AI 작업 원칙 (장기 메모리) -->
* **Strict Adherence**: AI must treat this document as its primary long-term memory and never deviate from these guidelines during coding or design.
<!-- 엄격한 준수: AI는 코딩, 디자인, 시스템 구성 시 반드시 본 .md 파일을 장기 메모리로 삼아 가이드라인을 절대 벗어나지 않아야 한다. -->
* **Multi-Agent Workflow**: Development is divided into specialized agents (Frontend, Backend/DB, Data Pipeline, CS/Ops, QA) for parallel execution.
<!-- 멀티 에이전트 워크플로우: 개발은 전문 에이전트(프론트엔드, 백엔드/DB, 데이터 파이프라인, CS/운영, QA)로 나누어 병렬로 작업한다. -->
* **Automation-First**: Aim for 100% automation of collection, optimization, and distribution without manual intervention.
<!-- 자동화 우선: 수집, 최적화, 배포의 전 과정은 사용자의 개입 없이 100% 자동화되는 것을 목표로 한다. -->

## 3. User Roles & Access Control
<!-- 3. 사용자 및 권한 관리 (접근 제어) -->
Only the designated 3 accounts have access to the administration backend.
<!-- 관리자 페이지는 아래 명시된 3명의 지정된 사용자만 로그인 및 이용이 가능하다. -->

| ID | Role | Key Functions |
| :--- | :--- | :--- |
| **mse@venturesquare.net** | Super Admin | System management, article/category edits, user settings. |
| **admin@venturesquare.net** | Super Admin | System management, article/category edits, user settings. |
| **editor@venturesquare.net** | Editor | Content (article) and category management. |
<!-- [ID: mse@..., Role: 최고 관리자, Key Functions: 전체 시스템 관리...] -->

## 4. Technical Architecture & AI Model Strategy
<!-- 4. 기술 아키텍처 및 AI 모델 전략 -->
* **Data Sources & Reliability Policy (Strict)**:
    - **Composition Ratio**:
        - **VentureSquare**: Min **40%**. (Absolute Priority: If the same news exists, use VentureSquare).
        - **Official Gov Sites**: Min **40%**. (K-Startup, Nara Market, MSS press releases).
        - **Others**: Max **20-30%**. (Global tech news, curated reliable sources).
    - **Reliability & Blacklist**:
        - **Blacklisted (DO NOT USE)**: `TheVC`, `StartupRecipe` (Source ambiguity/Untrustworthy).
        - **Conditional Use (Cross-check Required)**: `Wowtale`, `Platum`. Use only for fact-based news verified by multiple sources.
<!-- 데이터 소스 및 신뢰성 정책: 벤처스퀘어 최소 40%(동일 뉴스 시 최우선), 정부 공식 사이트 최소 40%로 구성. TheVC, 스타트업레시피는 신뢰 불가로 배제. 와우테일, 플래텀은 팩트 교차 검증 시에만 제한적으로 활용. -->
* **Data Curation & Snippet Strategy (High-Value Content)**:
    - **Target Segments & Sources**:
        - **Founders**: Funding trends (TheVC), Gov support (K-Startup), M&A/Exit news (StartupRecipe).
        - **Developers**: Emerging tech trends (Hacker News), New libraries/tools (Product Hunt), Global dev blogs.
        - **Investors**: Market analysis (KED Global), IPO/Pre-IPO news, Nara Market (G2B) procurement spikes.
    - **Extraction Method (Efficient & LLM-Ready)**:
        - Use **Jina Reader (r.jina.ai)** for clutter-free markdown extraction.
        - AI-powered **5-line Executive Summaries** (gemini-3.1-flash-lite-preview).
    - **Automatic Snippet Generation**:
        - Implement **Open Graph (OG) Preview Component** on the frontend to automatically render rich snippets (title, image, desc) when a link is inserted.
<!-- 데이터 큐레이션 및 스니펫 전략: 창업자(TheVC, K-Startup), 개발자(Hacker News, Product Hunt), 투자자(KED Global)를 위한 4단계 정보 수집 체계 구축. Jina Reader를 통한 본문 추출 및 5줄 요약(gemini-3.1-flash-lite-preview), OG 태그 기반 자동 스니펫 UI 구현. -->
    - **Fast Layer (gemini-3.1-flash-lite-preview)**: High-frequency processing. 3-line snippets, meta-tagging, initial search indexing, 1st-tier CS response. (Cost-effective)
    - **Smart Layer (gemini-3.1-flash-lite-preview)**: High-precision reasoning. Premium insight deep analysis, fact-checking, complex user dispute resolution, technical SEO restructuring.
<!-- 라이브 서비스 모델 라우팅: 고빈도 요약/태깅은 gemini-3.1-flash-lite-preview(가성비) 처리, 심층 분석 및 프리미엄 콘텐츠 검증은 gemini-3.1-flash-lite-preview(고성능) 처리. -->

* **Agent Performance Allocation (Development)**:
    - **Orchestrator (gemini-3.1-flash-lite-preview)**: Overall planning, task distribution, and cross-agent consistency management.
    - **Implementation (Claude 3.5 Sonnet / gemini-3.1-flash-lite-preview)**: Core logic, UI components, and security-critical coding.
    - **Verification & Documentation (gemini-3.1-flash-lite-preview)**: Unit test generation, linting, documentation updates, and simple bug fixes.
<!-- 개발 에이전트별 모델 배분: 총괄 기획(gemini-3.1-flash-lite-preview), 핵심 로직 구현(Claude Sonnet), 검증 및 문서화(gemini-3.1-flash-lite-preview)로 역할 분담 및 비용 최적화. -->

* **Embedding**: `text-embedding-004` (Google ecosystem consistency).
<!-- 임베딩: text-embedding-004 (구글 생태계 일관성 유지). -->

## 5. Monetization & Community
<!-- 5. 수익화 및 커뮤니티 -->
* **Payment Gateway**: **Toss Payments (토스페이먼츠)**
    - Use Toss Payments SDK/Widget for optimized checkout experience.
    - Implement Server-side verification for security.
<!-- 결제 서비스: 토스페이먼츠 (Toss Payments) 사용. 최적화된 결제 경험을 위해 SDK/위젯 연동 및 서버사이드 검증 구현. -->
* **Revenue Model**: Monthly automated settlements (20% platform fee) for certified experts providing premium insights.
<!-- 수익 모델: 프리미엄 인사이드를 제공하는 인증된 전문가를 위한 매월 자동 정산 (수수료 20%). -->
* **Structured Feedback**: Community participants use 5 tags (Additional Info, Debate, Counter-argument, Fact-check, General) to ensure high-quality discussion.
<!-- 구조화된 피드백: 커뮤니티 참여자는 정보의 품질을 위해 5가지 태그(추가 정보, 토론, 반박, 팩트체크, 단순 소감)를 필수로 선택. -->

## 6. Operation & AI CS
<!-- 6. 운영 및 AI CS -->
* **Context-Aware Support**: AI CS bots use RAG (Retrieval-Augmented Generation) based on markdown manuals and user DB status to resolve inquires.
<!-- 상황 인지 지원: AI CS 봇은 마크다운 매뉴얼과 사용자 DB 상태를 기반으로 RAG 방식으로 문의를 해결함. -->
* **Escalation**: Critical errors or legal issues are escalated to human admins via Slack/Email.
<!-- 에스컬레이션: 치명적 오류나 법적 문제는 슬랙/이메일을 통해 운영자에게 즉시 전달. -->
