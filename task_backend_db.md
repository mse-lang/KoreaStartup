# Task Allocation: Agent 1 - Backend & DB Architect
<!-- 업무 할당: 에이전트 1 - 백엔드 및 데이터베이스 설계자 -->

## Role Description
Agent 1 is responsible for the system's structural integrity and data consistency.
<!-- 역할 설명: 에이전트 1은 시스템의 구조적 무결성과 데이터 일관성을 책임집니다. -->

## Assigned Tasks
<!-- 할당된 업무 -->
- [ ] **Supabase PostgreSQL Schema Design**: Separate news, users, community feedback, and payment ledgers.
<!-- Supabase PostgreSQL 스키마 설계: 뉴스, 사용자, 커뮤니티 피드백, 결제 원장을 철저히 분리해야 합니다. -->
- [ ] **Administrator RBAC**: Implement access control for the 3 designated Super Admin/Editor accounts.
<!-- 관리자 권한 제어: 지정된 3명의 최고 관리자/편집자 계정을 위한 접근 제어를 구현합니다. -->
- [ ] **Ingest API Implementation**: Create `POST /api/v1/news/submit` using Basic Auth and IP whitelisting.
<!-- 수신 API 구현: Basic Auth 및 IP 화이트리스팅이 적용된 수신 엔드포인트를 생성합니다. -->
- [ ] **Payment & Settlement Integration**: 
    - Implement **Toss Payments** Core SDK integration.
    - Implement Secure Webhook handling for `payment_success` and `payment_fail`.
    - Implement **Monthly** automated settlement logic (20% fee).
<!-- 결제 및 정산 연동: 토스페이먼츠 Core SDK 연동, 보안 웹후크 처리, 및 20% 수수료 기반의 매월 자동 정산 로직을 구현합니다. -->
- [ ] **Auth Configuration**: Enable Google login.
<!-- 인증 구성: 카카오 및 구글 로그인을 활성화합니다. -->

## Key Considerations
<!-- 주요 고려 사항 -->
- **Supabase RLS Strategy**: Mandatory database-level security.
<!-- Supabase RLS 전략: 필수적인 데이터베이스 레벨 보안. -->
- **금융급 무결성**: 결제 원장(Monetization Ledger)의 엄격한 트랜잭션 관리.
