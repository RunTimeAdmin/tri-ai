# System Architecture

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [dissensus-engine/README.md](file://dissensus-engine/README.md)
- [dissensus-engine/package.json](file://dissensus-engine/package.json)
- [dissensus-engine/server/index.js](file://dissensus-engine/server/index.js)
- [dissensus-engine/server/debate-engine.js](file://dissensus-engine/server/debate-engine.js)
- [dissensus-engine/server/metrics.js](file://dissensus-engine/server/metrics.js)
- [dissensus-engine/public/index.html](file://dissensus-engine/public/index.html)
- [dissensus-engine/public/js/app.js](file://dissensus-engine/public/js/app.js)
- [dissensus-engine/docs/DEPLOY-VPS.md](file://dissensus-engine/docs/DEPLOY-VPS.md)
- [forum/server.py](file://forum/server.py)
- [forum/engine.js](file://forum/engine.js)
- [diss-launch-kit/website/index.html](file://diss-launch-kit/website/index.html)
</cite>

## Update Summary
**Changes Made**
- Removed Solana blockchain integration and staking functionality from all components
- Updated Express.js server architecture to remove staking endpoints and Solana balance queries
- Removed staking-related dependencies and configurations from package.json
- Updated frontend UI to remove wallet integration and staking controls
- Revised system context diagrams to reflect simplified architecture without blockchain features

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the Dissensus system architecture, focusing on the AI debate engine, research platform, and frontend applications. The system follows a microservices-style composition:
- Express.js server layer with Server-Sent Events (SSE) for real-time debate streaming
- Python-based research engine for web research and structured debate synthesis
- Frontend applications for user interaction and content presentation

The architecture emphasizes modularity, scalability, and clear separation of concerns across the AI debate orchestration, research synthesis, and user interface layers. The system has been simplified to focus on core debate functionality without blockchain integration or staking mechanisms.

## Project Structure
The repository organizes functionality into distinct modules:
- dissensus-engine: Express.js server, debate orchestration, SSE streaming, metrics, and frontend assets
- forum: Python Flask-based research engine and UI for structured debate synthesis
- diss-launch-kit: Landing page website for brand and token information
- Root-level documentation and deployment guides

```mermaid
graph TB
subgraph "dissensus-engine"
A_index["server/index.js"]
A_debate["server/debate-engine.js"]
A_metrics["server/metrics.js"]
A_ui["public/index.html + js/app.js"]
end
subgraph "forum"
F_server["server.py"]
F_engine["engine.js"]
end
subgraph "diss-launch-kit"
L_index["website/index.html"]
end
Internet["Internet Users"] --> A_ui
A_ui --> A_index
A_index --> A_debate
A_index --> A_metrics
A_ui --> F_engine
F_engine --> F_server
L_index --> A_ui
```

**Diagram sources**
- [dissensus-engine/server/index.js:1-356](file://dissensus-engine/server/index.js#L1-L356)
- [dissensus-engine/server/debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [dissensus-engine/server/metrics.js:1-112](file://dissensus-engine/server/metrics.js#L1-L112)
- [dissensus-engine/public/index.html:1-217](file://dissensus-engine/public/index.html#L1-L217)
- [dissensus-engine/public/js/app.js:1-554](file://dissensus-engine/public/js/app.js#L1-L554)
- [forum/server.py:1-495](file://forum/server.py#L1-L495)
- [forum/engine.js:1-323](file://forum/engine.js#L1-L323)
- [diss-launch-kit/website/index.html:1-451](file://diss-launch-kit/website/index.html#L1-L451)

**Section sources**
- [README.md:20-29](file://README.md#L20-L29)
- [dissensus-engine/README.md:110-134](file://dissensus-engine/README.md#L110-L134)

## Core Components
- Express.js Server (dissensus-engine/server/index.js)
  - Provides SSE streaming endpoint for real-time debate events
  - Exposes APIs for provider configuration, debate validation, metrics, and debate of the day
  - Implements rate limiting, security headers, and graceful shutdown
- Debate Engine (dissensus-engine/server/debate-engine.js)
  - Orchestrates a 4-phase dialectical process across three AI agents
  - Integrates with OpenAI, DeepSeek, and Google Gemini providers
  - Streams incremental agent outputs via SSE
- Metrics (dissensus-engine/server/metrics.js)
  - Tracks in-memory statistics for transparency dashboard
  - Aggregates provider usage, debates, and performance metrics
- Frontend (dissensus-engine/public)
  - React-like UI rendering with markdown rendering and SSE consumption
  - Provider/model selection and debate card generation
- Research Platform (forum/server.py, forum/engine.js)
  - Python-based web research and structured debate synthesis
  - Flask API for topic analysis, research gathering, and agent-generated content
- Landing Page (diss-launch-kit/website/index.html)
  - Marketing and token information site with navigation to the debate app

**Section sources**
- [dissensus-engine/server/index.js:1-356](file://dissensus-engine/server/index.js#L1-L356)
- [dissensus-engine/server/debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [dissensus-engine/server/metrics.js:1-112](file://dissensus-engine/server/metrics.js#L1-L112)
- [dissensus-engine/public/index.html:1-217](file://dissensus-engine/public/index.html#L1-L217)
- [dissensus-engine/public/js/app.js:1-554](file://dissensus-engine/public/js/app.js#L1-L554)
- [forum/server.py:1-495](file://forum/server.py#L1-L495)
- [forum/engine.js:1-323](file://forum/engine.js#L1-L323)
- [diss-launch-kit/website/index.html:1-451](file://diss-launch-kit/website/index.html#L1-L451)

## Architecture Overview
The system employs a layered architecture:
- Presentation Layer: Frontend apps (debate UI and landing page)
- API Layer: Express.js server handling SSE, validation, and integrations
- Orchestration Layer: Debate engine coordinating multi-agent AI workflows
- Integration Layer: AI providers and research synthesis
- Persistence Layer: In-memory metrics (planned persistence for production)

```mermaid
graph TB
Internet["Users"] --> FE_UI["Frontend UI (app.dissensus.fun)"]
FE_UI --> API["Express API (server/index.js)"]
API --> SSE["SSE Streaming"]
API --> ORCH["Debate Engine (debate-engine.js)"]
API --> METRICS["Metrics (metrics.js)"]
ORCH --> AI_Providers["AI Providers (OpenAI, DeepSeek, Gemini)"]
FE_UI --> RESEARCH["Research Platform (forum/server.py)"]
RESEARCH --> RESEARCH_UI["Forum UI (forum/engine.js)"]
```

**Diagram sources**
- [dissensus-engine/server/index.js:1-356](file://dissensus-engine/server/index.js#L1-L356)
- [dissensus-engine/server/debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [dissensus-engine/server/metrics.js:1-112](file://dissensus-engine/server/metrics.js#L1-L112)
- [forum/server.py:1-495](file://forum/server.py#L1-L495)
- [forum/engine.js:1-323](file://forum/engine.js#L1-L323)

## Detailed Component Analysis

### Express.js Server Layer
The Express server provides:
- SSE endpoint for real-time debate streaming
- Validation and rate-limited endpoints for providers, metrics, and debate of the day
- Health checks and configuration exposure
- Security middleware and graceful shutdown

```mermaid
sequenceDiagram
participant Client as "Frontend App"
participant API as "Express Server"
participant Engine as "DebateEngine"
participant AI as "AI Provider"
Client->>API : POST /api/debate/validate
API-->>Client : { ok } or error
Client->>API : GET /api/debate/stream?topic&provider&model&apiKey
API->>API : Apply rate limits
API->>Engine : new DebateEngine(key, provider, model)
Engine->>AI : Streamed chat completions
AI-->>Engine : Incremental chunks
Engine-->>API : Events {phase-start, agent-chunk, agent-done, ...}
API-->>Client : SSE data stream
API-->>Client : [DONE] when finished
```

**Diagram sources**
- [dissensus-engine/server/index.js:156-230](file://dissensus-engine/server/index.js#L156-L230)
- [dissensus-engine/server/debate-engine.js:131-396](file://dissensus-engine/server/debate-engine.js#L131-L396)

**Section sources**
- [dissensus-engine/server/index.js:26-356](file://dissensus-engine/server/index.js#L26-L356)
- [dissensus-engine/package.json:1-28](file://dissensus-engine/package.json#L1-L28)

### Real-Time Streaming Architecture (SSE)
The SSE implementation streams structured debate events:
- Headers configured to disable buffering and maintain streaming
- Client consumes via fetch with manual parsing of data blocks
- Events include phase transitions, agent turns, and final verdict

```mermaid
flowchart TD
Start(["Client connects to /api/debate/stream"]) --> Validate["Validate inputs and API key"]
Validate --> |Valid| Init["Initialize DebateEngine with provider/model/key"]
Validate --> |Invalid| Error["Return error to client"]
Init --> Stream["Stream incremental chunks via SSE"]
Stream --> Render["Frontend renders markdown and updates UI"]
Render --> Done{"[DONE] received?"}
Done --> |No| Stream
Done --> |Yes| Finish["Close connection and finalize metrics"]
```

**Diagram sources**
- [dissensus-engine/server/index.js:156-230](file://dissensus-engine/server/index.js#L156-L230)
- [dissensus-engine/public/js/app.js:286-341](file://dissensus-engine/public/js/app.js#L286-L341)

**Section sources**
- [dissensus-engine/server/index.js:192-230](file://dissensus-engine/server/index.js#L192-L230)
- [dissensus-engine/public/js/app.js:342-427](file://dissensus-engine/public/js/app.js#L342-L427)

### AI Providers Integration
The debate engine integrates with multiple providers:
- OpenAI (GPT-4o, GPT-4o Mini)
- DeepSeek (DeepSeek V3.2)
- Google Gemini (2.0 Flash, 2.5 Flash, 2.5 Flash-Lite)

Provider configuration includes base URLs, authentication headers, and model metadata. The engine streams incremental responses and emits structured events for the UI.

```mermaid
classDiagram
class DebateEngine {
+constructor(apiKey, provider, model)
+callAgent(agentId, messages, onChunk) string
+runDebate(topic, sendEvent) object
}
class Providers {
+baseUrl string
+models map
+authHeader(key) string
}
DebateEngine --> Providers : "uses"
```

**Diagram sources**
- [dissensus-engine/server/debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [dissensus-engine/server/debate-engine.js:14-39](file://dissensus-engine/server/debate-engine.js#L14-L39)

**Section sources**
- [dissensus-engine/server/debate-engine.js:14-39](file://dissensus-engine/server/debate-engine.js#L14-L39)
- [dissensus-engine/server/debate-engine.js:58-116](file://dissensus-engine/server/debate-engine.js#L58-L116)

### Python-Based Research Engine
The research platform performs:
- Web search via DuckDuckGo HTML scraping
- Topic analysis and domain classification
- Agent-generated content synthesis (opening statements, cross-examination, rebuttals, consensus)
- Flask API serving both static assets and backend endpoints

```mermaid
sequenceDiagram
participant UI as "Forum UI"
participant API as "Flask API (server.py)"
participant Search as "Web Search"
participant Analyzer as "Topic Analyzer"
participant Generator as "Agent Generators"
UI->>API : POST /api/discuss { topic }
API->>Analyzer : analyze_topic(topic)
API->>Search : research_topic(topic)
Search-->>API : research_facts[]
API->>Generator : generate_* functions
Generator-->>API : structured debate content
API-->>UI : JSON response with phases and synthesis
```

**Diagram sources**
- [forum/server.py:449-483](file://forum/server.py#L449-L483)
- [forum/server.py:68-140](file://forum/server.py#L68-L140)
- [forum/server.py:150-421](file://forum/server.py#L150-L421)
- [forum/engine.js:30-226](file://forum/engine.js#L30-L226)

**Section sources**
- [forum/server.py:1-495](file://forum/server.py#L1-L495)
- [forum/engine.js:1-323](file://forum/engine.js#L1-L323)

### Frontend Applications
- Debate UI (dissensus-engine/public)
  - Provider/model selection, API key handling, SSE consumption
  - Debate card generation and metrics dashboard
- Landing Page (diss-launch-kit/website)
  - Informational site with navigation to the debate app and token details

```mermaid
graph LR
FE_Index["public/index.html"] --> FE_App["public/js/app.js"]
FE_App --> SSE_Connect["Fetch SSE stream"]
FE_App --> CardGen["POST /api/card"]
FE_App --> Metrics["GET /metrics"]
```

**Diagram sources**
- [dissensus-engine/public/index.html:1-217](file://dissensus-engine/public/index.html#L1-L217)
- [dissensus-engine/public/js/app.js:1-554](file://dissensus-engine/public/js/app.js#L1-L554)

**Section sources**
- [dissensus-engine/public/index.html:1-217](file://dissensus-engine/public/index.html#L1-L217)
- [dissensus-engine/public/js/app.js:1-554](file://dissensus-engine/public/js/app.js#L1-L554)
- [diss-launch-kit/website/index.html:1-451](file://diss-launch-kit/website/index.html#L1-L451)

## Dependency Analysis
The system exhibits clear module boundaries and minimal coupling:
- Express server depends on debate engine, metrics, and card generator modules
- Frontend depends on server APIs and local state management
- Research platform is decoupled and can be scaled independently
- AI provider integrations are abstracted behind a provider configuration object

```mermaid
graph TB
Express["server/index.js"] --> Debate["server/debate-engine.js"]
Express --> Metrics["server/metrics.js"]
Frontend["public/js/app.js"] --> Express
ForumUI["forum/engine.js"] --> ForumAPI["forum/server.py"]
ForumAPI --> Research["Web Search + Generators"]
```

**Diagram sources**
- [dissensus-engine/server/index.js:11-24](file://dissensus-engine/server/index.js#L11-L24)
- [dissensus-engine/server/debate-engine.js:11-13](file://dissensus-engine/server/debate-engine.js#L11-L13)
- [dissensus-engine/server/metrics.js:1-8](file://dissensus-engine/server/metrics.js#L1-L8)
- [dissensus-engine/public/js/app.js:1-6](file://dissensus-engine/public/js/app.js#L1-L6)
- [forum/engine.js:1-9](file://forum/engine.js#L1-L9)
- [forum/server.py:11-19](file://forum/server.py#L11-L19)

**Section sources**
- [dissensus-engine/server/index.js:1-356](file://dissensus-engine/server/index.js#L1-L356)
- [dissensus-engine/server/debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [forum/server.py:1-495](file://forum/server.py#L1-L495)

## Performance Considerations
- SSE Streaming
  - Nginx configuration disables buffering for /api/debate/stream to ensure real-time delivery
  - Client-side fetch with manual parsing avoids EventSource limitations for error reporting
- Rate Limiting
  - Express rate limiter protects endpoints from abuse; configurable per environment
- Memory and CPU
  - Lightweight Node.js server; Python research engine can be scaled separately
- Caching and Compression
  - Nginx serves static assets with caching and gzip compression
- Scalability
  - Stateless design allows horizontal scaling of the Express server behind a load balancer
  - Research engine can be containerized and scaled independently

## Troubleshooting Guide
Common issues and resolutions:
- SSE streaming not working
  - Verify Nginx has proxy_buffering off for /api/debate/stream
  - Check proxy_read_timeout and proxy_send_timeout for long debates
- 502 Bad Gateway
  - Confirm Express service is running and listening on port 3000
  - Review systemd status and logs
- SSL Certificate Issues
  - Ensure DNS points to VPS and port 80 is reachable for Let's Encrypt
- Out of Memory
  - Add swap space on constrained VPS instances
- Provider API Errors
  - Validate API keys and model availability; check provider quotas and rate limits

**Section sources**
- [dissensus-engine/docs/DEPLOY-VPS.md:627-641](file://dissensus-engine/docs/DEPLOY-VPS.md#L627-L641)
- [dissensus-engine/docs/DEPLOY-VPS.md:601-672](file://dissensus-engine/docs/DEPLOY-VPS.md#L601-L672)

## Conclusion
Dissensus combines a real-time AI debate engine with a research-driven synthesis platform. The modular architecture supports clear separation of concerns, enabling independent scaling and maintenance of each component. The Express server layer provides robust SSE streaming, while the Python research engine offers flexible web research and structured debate synthesis. The simplified architecture focuses on core debate functionality without blockchain integration or staking mechanisms.

## Appendices

### System Context Diagrams
High-level user interaction and blockchain verification flows:

```mermaid
sequenceDiagram
participant User as "User"
participant App as "Debate App"
participant API as "Express API"
participant Providers as "AI Providers"
User->>App : Enter topic and credentials
App->>API : /api/debate/validate
API-->>App : Validation result
App->>API : /api/debate/stream
API->>Providers : Streamed chat completions
Providers-->>API : Incremental chunks
API-->>App : SSE events
App-->>User : Real-time debate UI
```

**Diagram sources**
- [dissensus-engine/public/js/app.js:209-341](file://dissensus-engine/public/js/app.js#L209-L341)
- [dissensus-engine/server/index.js:156-230](file://dissensus-engine/server/index.js#L156-L230)

### Deployment Topology
Recommended deployment topology for production:
- Nginx as reverse proxy and SSL terminator
- Express server behind systemd with automatic restarts
- Separate Python research engine service
- Environment-specific configuration via .env files
- Firewall rules allowing only 80/443 and loopback to Node.js

```mermaid
graph TB
Internet["Internet"] --> Nginx["Nginx (SSL, Proxy)"]
Nginx --> Express["Express Server (Node.js)"]
Express --> Providers["AI Providers"]
Nginx --> Static["Static Assets"]
Nginx -.-> Research["Python Research API"]
```

**Diagram sources**
- [dissensus-engine/docs/DEPLOY-VPS.md:711-740](file://dissensus-engine/docs/DEPLOY-VPS.md#L711-L740)