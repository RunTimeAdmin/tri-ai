# Project Overview

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [ROADMAP.md](file://ROADMAP.md)
- [competitive-analysis.md](file://competitive-analysis.md)
- [dissensus-engine/README.md](file://dissensus-engine/README.md)
- [dissensus-engine/server/agents.js](file://dissensus-engine/server/agents.js)
- [dissensus-engine/server/debate-engine.js](file://dissensus-engine/server/debate-engine.js)
- [diss-launch-kit/website/index.html](file://diss-launch-kit/website/index.html)
- [forum/server.py](file://forum/server.py)
</cite>

## Update Summary
**Changes Made**
- Removed all references to $DISS token and blockchain token integration
- Updated project description to focus solely on the AI debate platform
- Removed tokenomics and platform evolution sections from landing page
- Updated competitive landscape analysis to reflect token-free positioning
- Revised roadmap to remove token-related milestones

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
Dissensus is a multi-agent dialectical debate engine that brings adversarial AI reasoning to any topic through a structured, real-time debate process. The platform's mission is to deliver disciplined, evidence-based analysis through a four-phase dialectical process where three AI agents with opposing perspectives challenge each other's reasoning. The system ensures that claims are rigorously tested, evidence is weighed, and conclusions are grounded in data rather than relying on blockchain token mechanics.

The project's core philosophy is that truth emerges from disagreement. By structuring debate into four phases—Independent Analysis, Opening Arguments, Cross-Examination, and Final Verdict—the system ensures that topics are thoroughly examined from multiple angles, exposing biases and revealing robust insights. The three named agents—CIPHER (Skeptic), NOVA (Advocate), and PRISM (Synthesizer)—each embody distinct reasoning approaches and roles, enabling a balanced, adversarial process that challenges assumptions and reveals comprehensive understanding.

Target audiences include AI enthusiasts who want to observe structured reasoning in action, researchers seeking data-driven analysis and ranked outcomes, and general users who benefit from transparent, evidence-backed conclusions. The platform's unique value proposition lies in its real-time, web-research-enabled AI debates, structured dialectical process, and ranked consensus output delivered through pure AI reasoning without token-based gating mechanisms.

## Project Structure
The repository is organized into modular components that together form a cohesive AI debate platform:
- dissensus-engine: The main Node.js debate engine that orchestrates multi-agent debates and streams results in real time
- diss-launch-kit: The landing page and marketing assets for the project, featuring platform positioning and feature showcase
- forum: A Python/Flask service that powers research and debate synthesis for the AI Triad Forum
- Root-level documents: Roadmap, competitive analysis, and deployment references

```mermaid
graph TB
subgraph "Web Application"
A["dissensus-engine<br/>Main Debate Engine"]
B["diss-launch-kit<br/>Landing Page & Marketing"]
C["forum<br/>Research & Synthesis"]
end
A --> B
B --> A
C --> A
```

**Diagram sources**
- [dissensus-engine/README.md:90-112](file://dissensus-engine/README.md#L90-L112)
- [diss-launch-kit/website/index.html:1-451](file://diss-launch-kit/website/index.html#L1-L451)
- [forum/server.py:1-495](file://forum/server.py#L1-L495)

**Section sources**
- [README.md:20-29](file://README.md#L20-L29)
- [dissensus-engine/README.md:90-112](file://dissensus-engine/README.md#L90-L112)

## Core Components
- Multi-agent debate engine: Executes a 4-phase dialectical process with real-time streaming and structured outputs
- Three named agents: CIPHER (Skeptic), NOVA (Advocate), PRISM (Synthesizer) with distinct personalities and system prompts
- Research integration: Web search and topic analysis to inform debate content
- Transparent outputs: Ranked conclusions, confidence levels, and documented disagreements

**Section sources**
- [dissensus-engine/README.md:7-21](file://dissensus-engine/README.md#L7-L21)
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)
- [dissensus-engine/server/debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [forum/server.py:39-140](file://forum/server.py#L39-L140)

## Architecture Overview
The system integrates three primary layers:
- Frontend and UI: A cyberpunk-themed interface for initiating debates and viewing results
- Debate engine: Orchestrates multi-agent reasoning, manages streaming events, and coordinates provider APIs
- Research and synthesis: Performs web research and generates structured debate content for the agents

```mermaid
graph TB
UI["Browser UI<br/>index.html"] --> API["Debate Engine API<br/>debate-engine.js"]
API --> AG["Agents<br/>agents.js"]
API --> RES["Research & Synthesis<br/>forum/server.py"]
API --> EXT["External AI Providers<br/>OpenAI / DeepSeek / Gemini"]
RES --> AG
```

**Diagram sources**
- [dissensus-engine/README.md:90-112](file://dissensus-engine/README.md#L90-L112)
- [dissensus-engine/server/debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)
- [forum/server.py:39-140](file://forum/server.py#L39-L140)

## Detailed Component Analysis

### The Three Agents and Their Roles
The agents are defined with distinct identities, reasoning styles, and behavioral patterns:
- CIPHER (Skeptic): Red-team auditor who challenges assumptions, highlights risks, and seeks flaws
- NOVA (Advocate): Visionary optimist who builds the strongest bull case and identifies opportunities
- PRISM (Synthesizer): Neutral analyst who evaluates arguments, resolves disagreements, and delivers ranked conclusions

```mermaid
classDiagram
class Agent {
+string id
+string name
+string role
+string subtitle
+string color
+string portrait
+string systemPrompt
}
class CIPHER {
+id = "cipher"
+name = "CIPHER"
+role = "The Skeptic"
+subtitle = "Red Team Auditor"
+color = "#ff3b3b"
+portrait = "/images/characters/cipher-portrait.jpg"
}
class NOVA {
+id = "nova"
+name = "NOVA"
+role = "The Advocate"
+subtitle = "Blue-Sky Thinker"
+color = "#00ff88"
+portrait = "/images/characters/nova-portrait.jpg"
}
class PRISM {
+id = "prism"
+name = "PRISM"
+role = "The Synthesizer"
+subtitle = "Neutral Analyst"
+color = "#00d4ff"
+portrait = "/images/characters/prism-portrait.jpg"
}
Agent <|-- CIPHER
Agent <|-- NOVA
Agent <|-- PRISM
```

**Diagram sources**
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)

**Section sources**
- [dissensus-engine/README.md:7-13](file://dissensus-engine/README.md#L7-L13)
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)

### The 4-Phase Debate Process
The engine executes a structured dialectical process:
- Phase 1: Independent Analysis — agents analyze the topic in parallel
- Phase 2: Opening Arguments — each agent presents their formal position
- Phase 3: Cross-Examination — agents challenge each other's arguments
- Phase 4: Final Verdict — PRISM synthesizes into ranked conclusions with confidence levels

```mermaid
sequenceDiagram
participant U as "User"
participant S as "Server"
participant D as "DebateEngine"
participant A as "Agents"
participant P as "Provider API"
U->>S : Submit topic
S->>D : runDebate(topic)
D->>A : Phase 1 : Independent Analysis
A->>P : Streamed requests
P-->>A : Streaming chunks
A-->>D : Results
D->>U : SSE : phase-start(1)
D->>U : SSE : agent-chunk(1)
D->>U : SSE : agent-done(1)
D->>A : Phase 2 : Opening Arguments
A->>P : Streamed requests
P-->>A : Streaming chunks
A-->>D : Results
D->>U : SSE : phase-start(2)
D->>U : SSE : agent-chunk(2)
D->>U : SSE : agent-done(2)
D->>A : Phase 3 : Cross-Examination
A->>P : Streamed requests
P-->>A : Streaming chunks
A-->>D : Results
D->>U : SSE : phase-start(3)
D->>U : SSE : agent-chunk(3)
D->>U : SSE : agent-done(3)
D->>A : Phase 4 : Final Verdict
A->>P : Streamed requests
P-->>A : Streaming chunks
A-->>D : Results
D->>U : SSE : phase-start(4)
D->>U : SSE : agent-chunk(4)
D->>U : SSE : agent-done(4)
D->>U : SSE : debate-done
```

**Diagram sources**
- [dissensus-engine/server/debate-engine.js:121-200](file://dissensus-engine/server/debate-engine.js#L121-L200)
- [dissensus-engine/server/debate-engine.js:58-116](file://dissensus-engine/server/debate-engine.js#L58-L116)

**Section sources**
- [dissensus-engine/README.md:15-21](file://dissensus-engine/README.md#L15-L21)
- [dissensus-engine/server/debate-engine.js:121-200](file://dissensus-engine/server/debate-engine.js#L121-L200)

### Research Integration and Topic Analysis
The forum component performs web research and topic analysis to inform debate content:
- Web search via DuckDuckGo HTML scraping
- Topic classification (question, comparison, prediction, normative, etc.)
- Domain-aware categorization (crypto, AI, finance, energy)
- Generation of opening statements, cross-examination, rebuttals, and synthesis

```mermaid
flowchart TD
Start(["Topic Submitted"]) --> Analyze["Analyze Topic<br/>classification & domain"]
Analyze --> Search["Web Search<br/>main + domain-specific"]
Search --> Summarize["Build Research Summary<br/>extract facts"]
Summarize --> Generate["Generate Debate Content<br/>opening, cross-exam, rebuttal, synthesis"]
Generate --> End(["Structured Output"])
```

**Diagram sources**
- [forum/server.py:69-140](file://forum/server.py#L69-L140)
- [forum/server.py:449-483](file://forum/server.py#L449-L483)

**Section sources**
- [forum/server.py:39-140](file://forum/server.py#L39-L140)
- [forum/server.py:449-483](file://forum/server.py#L449-L483)

### Competitive Landscape and Differentiation
The project occupies a unique niche in the AI debate space:
- No polished, consumer-facing, web-based product currently offers three distinct agents debating through a structured dialectical process with ranked consensus output
- Differentiation pillars include consumer-first design, structured 4-phase process, named agents with distinct personalities, ranked consensus, real research integration, transparency, and domain expertise

**Section sources**
- [competitive-analysis.md:28-34](file://competitive-analysis.md#L28-L34)
- [competitive-analysis.md:95-130](file://competitive-analysis.md#L95-L130)

## Dependency Analysis
The system exhibits clear separation of concerns:
- The debate engine depends on agent definitions and external AI providers
- The research component supplies structured content to agents
- The UI consumes SSE events from the debate engine

```mermaid
graph LR
UI["UI"] --> DE["Debate Engine"]
DE --> AG["Agents"]
DE --> RES["Research"]
DE --> EXT["AI Providers"]
RES --> AG
```

**Diagram sources**
- [dissensus-engine/server/debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)
- [forum/server.py:39-140](file://forum/server.py#L39-L140)

**Section sources**
- [dissensus-engine/server/debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [dissensus-engine/server/agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)
- [forum/server.py:39-140](file://forum/server.py#L39-L140)

## Performance Considerations
- Streaming responses: The debate engine streams provider responses to minimize latency and improve perceived responsiveness
- Parallel processing: Phase 1 runs all agents concurrently to reduce total debate time
- Provider selection: Cost and speed trade-offs are configurable via environment variables and provider settings
- Rate limiting and security: Production deployments should include rate limiting, authentication, and HTTPS

## Troubleshooting Guide
Common operational issues and remedies:
- API key configuration: Ensure provider keys are set correctly and match supported providers
- Network connectivity: Verify outbound access to provider endpoints
- SSE streaming: Confirm server supports Server-Sent Events and client browser compatibility

**Section sources**
- [dissensus-engine/README.md:156-161](file://dissensus-engine/README.md#L156-L161)
- [dissensus-engine/server/debate-engine.js:58-116](file://dissensus-engine/server/debate-engine.js#L58-L116)

## Conclusion
Dissensus combines adversarial AI reasoning with a pure AI debate platform to deliver a unique, real-time debate experience. Its structured dialectical process, named agents, and ranked consensus outputs differentiate it from academic frameworks and developer tools. The platform targets AI enthusiasts, researchers, and general users seeking transparent, evidence-backed insights through three distinct AI perspectives engaging in rigorous, structured debate without any token-based gating mechanisms.

## Appendices

### Vision and Roadmap Highlights
- Vision: AI-powered dialectical debate platform. Three AI agents engage in structured, truth-seeking argumentation to analyze complex topics from multiple perspectives
- Current phase: Pre-launch or early launch with landing page live and app deployed on VPS
- Target: Q1–Q2 2026 for platform live, Q2–Q3 2026 for premium and burn utility, Q3 2026+ for governance

**Section sources**
- [ROADMAP.md:3-135](file://ROADMAP.md#L3-L135)
- [diss-launch-kit/website/index.html:270-315](file://diss-launch-kit/website/index.html#L270-L315)