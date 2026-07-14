# ECHO AI Tech Stack

This document outlines the recommended technology stack for building ECHO AI from a lightweight prototype into a secure internal research assistant for Jira, Confluence, Release Notes, and Momentum operational logs.

## 1. Frontend

### Recommended Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Optional component library: shadcn/ui

### Why

The frontend should be fast, clean, and easy to evolve into a real dashboard. React with TypeScript gives the project a strong foundation for reusable components, source filters, result cards, evidence panels, and future workflows like report exports or ticket drafting.

### Frontend Responsibilities

- Research input screen
- Source toggles for Jira, Confluence, Release Notes, and Momentum Logs
- Classification summary
- Confidence and evidence display
- Related Jira ticket results
- Related Confluence documentation results
- Release Note result cards
- Recommended next steps
- Future export or copy-to-ticket actions

## 2. Backend API

### Recommended Stack

- Python
- FastAPI
- Pydantic
- Uvicorn

### Why

FastAPI is a strong fit for API-driven internal tools. It is lightweight, easy to document, and works well with typed request and response models. Python is also practical for search, ranking, text processing, summarization, and future AI features.

### Backend Responsibilities

- Receive research queries from the frontend
- Detect whether the input is a Jira key, summary, error message, or free-text problem description
- Coordinate searches across Jira, Confluence, Release Notes, and Momentum operational logs
- Normalize source results into a shared format
- Rank results
- Classify the issue
- Return evidence-backed recommendations

## 3. Integrations

### Jira

Needed for:

- Issue lookup by key
- JQL searches
- Similar issue discovery
- Ticket status, resolution, labels, components, fix versions, and affected versions
- Linked issue detection
- Comment and resolution-note retrieval

Recommended integration method:

- Jira REST API
- Service account or approved OAuth flow

### Confluence

Needed for:

- Documentation search
- Troubleshooting article lookup
- Known issue page lookup
- Runbook discovery
- Excerpt retrieval

Recommended integration method:

- Confluence REST API
- CQL search
- Service account or approved OAuth flow

### Release Notes

Needed for:

- Fixed version lookup
- Known issue references
- Patch and hotfix notes
- Affected version context
- Release-specific workarounds

Possible source options:

- Confluence release-note spaces
- Static internal release-note pages
- Markdown or HTML release-note repository
- Product changelog API
- Internal documentation portal

### Momentum Operational Logs

Use an approved Momentum API, audit feed, or read-only export to retrieve completed actions and outcomes that may not have produced Jira tickets.

Required safeguards:

- Read-only, least-privilege access
- Role and permission context where available
- Clear separation between approved procedures and historical one-off actions
- Redaction or omission of sensitive operational details
- Evidence links or stable log references for analyst review

## 4. Search and Ranking

### MVP Approach

- Keyword matching
- Component matching
- Label matching
- Status and resolution weighting
- Fix version and affected version matching
- Release-note version matching
- Recency weighting

### Later Enhancement

- Vector search
- Semantic similarity
- Embeddings
- Query expansion
- Entity extraction for products, components, error codes, versions, and systems

### Recommended Stack for Later Search

- PostgreSQL with pgvector, or
- OpenSearch, or
- Elasticsearch

For MVP, start with deterministic API search and simple scoring before adding vector search.

## 5. Data Storage

### MVP

ECHO AI does not need to store Jira or Confluence content at first. It can query live sources and return results directly.

### Recommended Storage When Needed

- PostgreSQL
- SQLAlchemy or SQLModel
- Alembic migrations

### Store Only If Needed

- User search history
- Saved research reports
- Feedback on result quality
- Source configuration
- Audit logs
- Cached metadata

## 6. AI and Summarization Layer

### MVP

The prototype now uses a live local Ollama model for classification, summaries, recommendations, and follow-up answers. It defaults to `qwen2.5:3b` and keeps the model configurable with `OLLAMA_MODEL`. The source evidence remains mocked until the Jira, Confluence, Release Notes, and Momentum connectors are implemented.

### Later Enhancement

Use an approved internal model or local model to:

- Summarize related tickets
- Extract workarounds
- Identify likely duplicates
- Draft next-step recommendations
- Draft Jira or Confluence updates

### Important Guardrail

ECHO AI should always show source evidence. AI-generated summaries should not replace links, ticket IDs, release references, or documentation excerpts.

## 7. Authentication and Security

### Required

- Internal user authentication
- Secure storage for API tokens and secrets
- Role-based access where needed
- HTTPS in deployed environments
- Least-privilege access to Jira, Confluence, and Release Notes

### Recommended Stack

- Enterprise SSO if available
- OAuth where supported
- Environment variables for local development
- Secret manager for deployed environments

### Security Principles

- Do not expose Jira or Confluence tokens in the browser
- Do not send internal ticket data to unapproved third-party services
- Do not store source content unless there is a clear need
- Log access carefully without leaking sensitive issue details

## 8. Deployment

### Local Development

- Node.js for frontend tooling
- Python virtual environment for backend
- Local `.env` file for development settings

### Internal Deployment Options

- Docker
- Internal VM
- Kubernetes
- Azure App Service
- AWS ECS
- On-prem server

The right deployment choice depends on the organization's infrastructure standards.

## 9. DevOps and Quality

### Recommended Tooling

- Git
- GitHub, GitLab, Azure DevOps, or Bitbucket
- CI pipeline
- Automated linting
- Automated tests
- Dependency scanning
- Secret scanning

### Testing Stack

- Frontend unit tests: Vitest
- Frontend UI tests: Playwright
- Backend unit tests: Pytest
- API tests: Pytest with HTTPX

## 10. Suggested Project Structure

```text
echo-ai/
  frontend/
    src/
      components/
      pages/
      services/
      types/
  backend/
    app/
      api/
      connectors/
      ranking/
      classification/
      models/
      config/
    tests/
  docs/
    architecture.md
    security.md
    api-contract.md
  README.md
```

## 11. Build Phases

### Phase 1: Demo Prototype

- Static dashboard UI
- Mock Jira, Confluence, and Release Note results
- Mock classification and recommendations

### Phase 2: Real Backend Shell

- FastAPI backend
- Typed API contract
- Mock service responses from backend instead of browser-only mock data

### Phase 3: Jira Integration

- Issue lookup
- JQL search
- Normalized Jira result model

### Phase 4: Confluence Integration

- Documentation search
- Page excerpts
- Source links

### Phase 5: Release Notes Integration

- Search release notes by version, component, keyword, fix ID, and hotfix text
- Return release-note evidence alongside Jira and Confluence results

### Phase 6: Ranking and Classification

- Scoring rules
- Classification logic
- Confidence calculation

### Phase 7: AI-Assisted Summaries

- Evidence-based summaries
- Workaround extraction
- Recommended next actions

## 12. Recommended MVP Stack Summary

| Layer | Recommendation |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui or lightweight custom components |
| Icons | Lucide React |
| Backend | Python FastAPI |
| Models | Pydantic |
| Jira Integration | Jira REST API |
| Confluence Integration | Confluence REST API |
| Release Notes | Internal page, repo, API, or Confluence release space |
| Database | None for earliest MVP; PostgreSQL later |
| Search | API search and scoring first; pgvector/OpenSearch later |
| Testing | Vitest, Playwright, Pytest |
| Deployment | Docker plus internal hosting |
| Security | SSO/OAuth, secret manager, least-privilege access |
