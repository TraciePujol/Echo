# ECHO AI

**Enterprise Case & Historical Operations**

ECHO AI is an intelligent research assistant for support, analysis, and delivery teams that need to quickly discover historical knowledge across Jira, Confluence, release notes, and Momentum operational logs. It helps analysts narrow the investigation by identifying similar tickets, known fixes, workarounds, version-specific changes, related documentation, successful no-ticket actions, and recommended next steps for both draft tickets and incoming submitted tickets.

## Purpose

Business Analysts, help desk agents, support engineers, QA teams, developers, PMs, and technical writers often spend significant time researching whether an issue has happened before, whether it was fixed in a release, or whether a workaround was documented. ECHO AI reduces that effort by acting as a first-line research companion before a new ticket is submitted and after a ticket enters the queue without prior research. It does not replace analyst judgment or ownership; it gives analysts stronger evidence so they can make better decisions faster.

## Core User Flow

1. A user enters a draft ticket summary, incoming Jira issue key, short summary, problem description, or error message.
2. ECHO AI searches Jira, Confluence, release notes, and approved Momentum operational logs through authenticated APIs or approved internal sources.
3. Results are ranked by relevance, similarity, status, component, labels, linked issues, documentation matches, and release/version references.
4. ECHO AI returns a structured research summary with related tickets, known fixes, release references, documentation, classification, and suggested paths such as creating a new ticket, linking existing work, using a workaround, updating documentation, or escalating.

## MVP Scope

### Inputs

- Jira issue key
- Incoming submitted ticket
- Draft ticket summary
- Short summary
- Problem description
- Error message

### Processing

- Jira REST API search
- Confluence REST API search
- Release notes search
- Momentum operational-log search
- Similarity ranking for related issues and pages
- Keyword and context analysis
- Optional local summarization layer

### Outputs

- Similar or related Jira tickets
- Known workarounds, patches, and release-note references
- Related Confluence documentation
- Relevant Momentum actions that resolved similar symptoms without a ticket
- Issue classification:
  - Known
  - Unresolved
  - Fixed
  - Duplicated
  - Undocumented
- Recommended next steps:
  - Create a new Jira ticket
  - Route or review an incoming ticket
  - Link related issues
  - Avoid duplicate ticket submission
  - Use a known workaround
  - Update documentation
  - Submit an enhancement idea
  - Use an approved self-service action without creating a ticket

## Target Users

- Business Analysts
- Help Desk Tier 1 and Tier 2
- Support Engineers
- QA and Test Teams
- Developers investigating defects
- Product Managers needing historical context
- Technical Writers maintaining documentation

## Run the Local-AI Prototype

ECHO now uses the local Ollama service and defaults to the existing `qwen2.5:3b` model.

1. Make sure Ollama is running and `qwen2.5:3b` is installed.
2. From this folder, run `npm start`.
3. Open `http://127.0.0.1:4173`.

Optional environment settings:

- `OLLAMA_MODEL` selects another installed model, such as `mistral:instruct`.
- `OLLAMA_BASE_URL` selects a different local Ollama endpoint.
- `PORT` changes the ECHO web-server port.

The model analyzes the prototype evidence shown in the interface. Jira, Confluence, Release Notes, and Momentum are not live-connected yet, and ECHO identifies the evidence as prototype data in its prompts and responses.

## Online Demo

[Open the public ECHO AI demo](https://traciepujol.github.io/Echo/).

The public GitHub Pages version automatically switches to a clearly labeled simulation when the local Node/Ollama service is unavailable. It supports the research examples, source filters, Momentum no-ticket scenario, classifications, recommendations, and follow-up conversation without sending company data anywhere.

The online experience is a product demonstration, not a live Jira, Confluence, Release Notes, Momentum, or AI-model integration. Run `npm start` from the T-drive workspace to demonstrate the live local `qwen2.5:3b` brain.

## Suggested MVP Architecture

### Frontend

- Lightweight web app
- Single research input
- Structured result sections
- Filters for source, status, component, and confidence

### Backend

- Python FastAPI or Node.js API
- Jira REST API integration
- Confluence REST API integration
- Release notes integration
- Momentum operational-log integration
- Search orchestration layer
- Ranking and classification logic
- Local Ollama summarization and decision support (`qwen2.5:3b` by default)

### Security

- Uses authenticated Jira, Confluence, and Momentum access
- Runs inside a private network when required
- No third-party cloud inference required for MVP
- Stores no ticket data unless explicitly configured

## Initial Build Milestones

### Milestone 1: Static Research Experience

- Build lightweight web UI
- Accept issue key, summary, or description
- Display mocked Jira, Confluence, release-note, and Momentum operational-log results
- Show classification and next-step recommendations

### Milestone 2: Jira Search Integration

- Add secure Jira API configuration
- Search by issue key, keywords, labels, component, and status
- Normalize Jira results into a consistent internal format

### Milestone 3: Confluence Search Integration

- Add Confluence API configuration
- Search related pages, known issue articles, and support docs
- Return excerpts and source links

### Milestone 4: Release Notes Search Integration

- Add release notes as a first-class searchable source
- Search by version, date, component, fix ID, known issue, patch, and hotfix text
- Return release references with source links and affected/fixed version context

### Milestone 5: Ranking and Classification

- Score related tickets and pages
- Detect likely duplicates, known fixes, unresolved issues, and documentation gaps
- Produce a clear confidence level for each recommendation

### Milestone 5A: Momentum Operational History

- Search approved operational logs for actions completed without a Jira ticket
- Distinguish repeatable low-risk procedures from unapproved or one-off actions
- Recommend no-ticket self-service only when the action, permissions, and conditions match
- Surface repeated undocumented fixes as runbook candidates

### Milestone 6: Summarized Research Report

- Generate a structured response suitable for support review
- Include evidence links for each conclusion
- Recommend next action based on classification

## Success Metrics

- Reduced research time per ticket
- Fewer duplicate Jira issues
- Fewer unnecessary ticket submissions
- Faster incoming-ticket review
- Faster support resolution
- Reduced SME escalations
- Increased documentation updates
- Higher reuse of historical knowledge

## Future Roadmap

- Auto-draft Jira tickets
- Auto-draft Confluence pages
- Slack or Microsoft Teams integration
- Tag and label suggestions
- Component-level pattern detection
- Recurring issue trend analytics
- Automated root cause suggestions
- Bulk research mode for multiple tickets
- Integration into broader internal delivery ecosystems
