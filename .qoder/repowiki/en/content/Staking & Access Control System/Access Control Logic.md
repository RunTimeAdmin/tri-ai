# Access Control Logic

<cite>
**Referenced Files in This Document**
- [README.md](file://dissensus-engine/README.md)
- [index.js](file://dissensus-engine/server/index.js)
- [app.js](file://dissensus-engine/public/js/app.js)
- [debate-engine.js](file://dissensus-engine/server/debate-engine.js)
- [debate-store.js](file://dissensus-engine/server/debate-store.js)
- [workspace.js](file://dissensus-engine/server/workspace.js)
- [db.js](file://dissensus-engine/server/db.js)
- [package.json](file://dissensus-engine/package.json)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for new debate visibility states (private, public, shared)
- Documented share token generation mechanism for anonymous access
- Enhanced frontend JavaScript functions documentation for toggleDebateVisibility() and generateShareLink()
- Updated workspace management integration details
- Added new API endpoints for debate visibility and sharing
- Expanded access control examples to include visibility-based permissions

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

## Introduction
This document explains the access control system that governs feature availability and debate initiation. It covers how staking tiers map to feature access, the debate permission system, and API endpoint protection. It documents the preflight validation workflow, the integration with debate initiation, and the enforcement mode controlled by STAKING_ENFORCE. It also describes simulation versus production behavior and how access control affects user experience across tiers.

**Updated** Added comprehensive coverage of debate visibility states (private, public, shared) with share token generation for anonymous access, enhanced frontend JavaScript functions for toggleDebateVisibility() and generateShareLink(), and improved workspace management integration.

## Project Structure
The access control logic spans the frontend and backend:
- Frontend (public/js/app.js): Manages UI state, wallet input, staking enforcement flag, preflight validation, and debate visibility controls.
- Backend (server/index.js): Implements API endpoints, input validation, rate limiting, SSE streaming, and debate visibility management.
- Debate store (server/debate-store.js): Handles debate persistence, visibility states, and share token generation.
- Workspace management (server/workspace.js): Manages team collaboration and access control.
- Database schema (server/db.js): Defines storage structure for users, workspaces, and debate metadata.
- Debate engine (server/debate-engine.js): Executes the 4-phase debate orchestration.
- Documentation (README.md): Describes staking tiers, enforcement mode, and endpoints.

```mermaid
graph TB
subgraph "Frontend"
UI["User Interface<br/>public/js/app.js"]
VIS["Visibility Controls<br/>toggleDebateVisibility()"]
SHARE["Share Generation<br/>generateShareLink()"]
end
subgraph "Backend"
CFG["Config Endpoint<br/>GET /api/config"]
VAL["Preflight Validation<br/>POST /api/debate/validate"]
STR["Debate Stream<br/>GET /api/debate/stream"]
TIER["Staking Tiers<br/>GET /api/staking/tiers"]
STAT["Staking Status<br/>GET /api/staking/status"]
STAKE["Simulated Stake<br/>POST /api/staking/stake"]
UNSTAKE["Simulated Unstake<br/>POST /api/staking/unstake"]
VISAPI["Visibility Toggle<br/>POST /api/debate/:id/visibility"]
SHAREAPI["Share Token<br/>POST /api/debate/:id/share"]
WS["Workspace Management<br/>GET/POST /api/workspaces"]
end
subgraph "Debate Store"
STORE["Debate Persistence<br/>debate-store.js"]
DB["Database Schema<br/>db.js"]
end
subgraph "Debate Engine"
DE["Debate Execution<br/>server/debate-engine.js"]
end
UI --> CFG
UI --> VAL
UI --> STR
UI --> VIS
UI --> SHARE
VIS --> VISAPI
SHARE --> SHAREAPI
VISAPI --> STORE
SHAREAPI --> STORE
STORE --> DB
CFG --> UI
VAL --> STR
STR --> DE
WS --> STORE
```

**Diagram sources**
- [index.js:58-230](file://dissensus-engine/server/index.js#L58-L230)
- [app.js:642-674](file://dissensus-engine/public/js/app.js#L642-L674)
- [debate-engine.js:41-387](file://dissensus-engine/server/debate-engine.js#L41-L387)
- [debate-store.js:16-32](file://dissensus-engine/server/debate-store.js#L16-L32)
- [workspace.js:1-39](file://dissensus-engine/server/workspace.js#L1-L39)

**Section sources**
- [README.md:78-90](file://dissensus-engine/README.md#L78-L90)
- [index.js:58-230](file://dissensus-engine/server/index.js#L58-L230)
- [app.js:642-674](file://dissensus-engine/public/js/app.js#L642-L674)

## Core Components
- Staking tiers and daily limits: Defined in documentation and surfaced via GET /api/staking/tiers. The enforcement mode (STAKING_ENFORCE=1) controls whether a wallet is required and daily debate limits are enforced.
- Preflight validation: POST /api/debate/validate checks topic length, model validity, and API key presence before initiating SSE streaming.
- SSE debate stream: GET /api/debate/stream validates inputs, streams debate events, and records metrics.
- Debate visibility system: Manages three visibility states (private, public, shared) with authentication-required operations.
- Share token generation: Creates 16-character tokens for anonymous access to shared debates.
- Workspace management: Enables team collaboration with member-based access control.
- Frontend integration: The UI reads STAKING_ENFORCE from /api/config, optionally enforces wallet presence, and passes wallet to preflight and stream endpoints.

**Updated** Added comprehensive coverage of debate visibility states, share token generation, and workspace management integration.

**Section sources**
- [README.md:78-90](file://dissensus-engine/README.md#L78-L90)
- [index.js:124-230](file://dissensus-engine/server/index.js#L124-L230)
- [app.js:13-14](file://dissensus-engine/public/js/app.js#L13-L14)
- [debate-store.js:24-25](file://dissensus-engine/server/debate-store.js#L24-L25)

## Architecture Overview
The access control architecture combines frontend-driven preflight checks with backend validations and rate limiting. The enforcement mode toggles whether a wallet is mandatory and whether daily debate limits apply. The new visibility system adds granular access control for individual debates.

```mermaid
sequenceDiagram
participant U as "User"
participant F as "Frontend (app.js)"
participant B as "Backend (index.js)"
participant S as "Store (debate-store.js)"
participant E as "Debate Engine"
U->>F : "Click Start Debate"
F->>F : "Read STAKING_ENFORCE from /api/config"
alt Enforced
F->>F : "Require wallet input"
F->>B : "POST /api/debate/validate {topic, apiKey, provider, model, wallet}"
else Not enforced
F->>B : "POST /api/debate/validate {topic, apiKey, provider, model}"
end
B-->>F : "200 OK or error"
F->>B : "GET /api/debate/stream?{topic, provider, model, apiKey, wallet}"
B->>E : "Instantiate DebateEngine and runDebate()"
E-->>B : "Events (phase-start, agent-chunk, etc.)"
B-->>F : "SSE stream"
F->>F : "Render events and update UI"
U->>F : "Toggle Visibility / Generate Share Link"
F->>B : "POST /api/debate/ : id/visibility or /api/debate/ : id/share"
B->>S : "Update visibility or generate token"
S-->>B : "Success/Failure"
B-->>F : "Response with new state"
```

**Diagram sources**
- [index.js:124-230](file://dissensus-engine/server/index.js#L124-L230)
- [app.js:209-356](file://dissensus-engine/public/js/app.js#L209-L356)
- [debate-engine.js:121-386](file://dissensus-engine/server/debate-engine.js#L121-L386)
- [debate-store.js:93-106](file://dissensus-engine/server/debate-store.js#L93-L106)

## Detailed Component Analysis

### Staking Tiers and Feature Access
- Tiers define minimum stake thresholds, daily debate limits, and unlockable features. These are exposed via GET /api/staking/tiers and rendered in the UI.
- In simulation mode, the UI allows setting a wallet and simulating stake/unstake via POST /api/staking/stake and POST /api/staking/unstake. Status is queried via GET /api/staking/status.
- In production, on-chain verification would replace simulation, but the API surface remains the same.

```mermaid
flowchart TD
Start(["Load Staking Info"]) --> FetchTiers["GET /api/staking/tiers"]
FetchTiers --> ShowTiers["Render tier table in UI"]
ShowTiers --> WalletSaved{"Wallet saved?"}
WalletSaved --> |No| PromptWallet["Prompt to save wallet"]
WalletSaved --> |Yes| FetchStatus["GET /api/staking/status?wallet"]
FetchStatus --> ShowTier["Display tier and remaining debates"]
ShowTier --> CanDebate{"Can initiate debate?"}
CanDebate --> |Yes| Proceed["Proceed to preflight"]
CanDebate --> |No| Halt["Show limit reached message"]
```

**Diagram sources**
- [app.js:556-568](file://dissensus-engine/public/js/app.js#L556-L568)
- [app.js:492-515](file://dissensus-engine/public/js/app.js#L492-L515)

**Section sources**
- [README.md:78-90](file://dissensus-engine/README.md#L78-L90)
- [app.js:492-568](file://dissensus-engine/public/js/app.js#L492-L568)

### Debate Permission System and canDebate() Workflow
The frontend enforces a can-debate check before allowing debate initiation:
- Read STAKING_ENFORCE from /api/config.
- If enforced, require a valid wallet (length check).
- Optionally pass wallet to preflight and stream endpoints.
- The preflight endpoint validates topic, model, and API key, and returns success or an error.

```mermaid
flowchart TD
A["User clicks Start Debate"] --> B["Fetch /api/config"]
B --> C{"STAKING_ENFORCE enabled?"}
C --> |No| D["Skip wallet requirement"]
C --> |Yes| E["Require wallet input"]
E --> F{"Wallet valid?"}
F --> |No| G["Show error and focus wallet input"]
F --> |Yes| H["Proceed to preflight"]
D --> H
H --> I["POST /api/debate/validate"]
I --> J{"Validation OK?"}
J --> |No| K["Show validation error"]
J --> |Yes| L["GET /api/debate/stream with optional wallet"]
L --> M["Stream debate events"]
```

**Diagram sources**
- [app.js:209-356](file://dissensus-engine/public/js/app.js#L209-L356)
- [index.js:124-151](file://dissensus-engine/server/index.js#L124-L151)

**Section sources**
- [app.js:228-236](file://dissensus-engine/public/js/app.js#L228-L236)
- [index.js:124-151](file://dissensus-engine/server/index.js#L124-L151)

### Debate Visibility States and Access Control
The system now supports three visibility states for debates:
- **Private**: Only the creator can access and modify the debate
- **Public**: Visible to authenticated users but not searchable
- **Shared**: Accessible via share token without authentication

Visibility management is handled through dedicated endpoints with authentication requirements:
- POST /api/debate/:id/visibility: Toggles between private and public states
- POST /api/debate/:id/share: Generates a 16-character share token for anonymous access
- Authentication middleware ensures only debate owners can modify visibility or generate tokens

```mermaid
flowchart TD
Init["User initiates debate"] --> Private["Default: Private"]
Private --> Toggle{"User toggles visibility?"}
Toggle --> |Private| Private
Toggle --> |Public| Public["Set to Public"]
Public --> Share{"Generate share link?"}
Share --> |No| Public
Share --> |Yes| Shared["Generate 16-char token<br/>Set to Shared"]
Shared --> Anonymous["Anonymous users<br/>can access via token"]
Private --> OwnerOnly["Only owner can access"]
Public --> AuthUsers["Authenticated users can access"]
```

**Diagram sources**
- [debate-store.js:24](file://dissensus-engine/server/debate-store.js#L24)
- [debate-store.js:93-106](file://dissensus-engine/server/debate-store.js#L93-L106)
- [index.js:526-542](file://dissensus-engine/server/index.js#L526-L542)

**Section sources**
- [debate-store.js:24-25](file://dissensus-engine/server/debate-store.js#L24-L25)
- [debate-store.js:93-106](file://dissensus-engine/server/debate-store.js#L93-L106)
- [index.js:526-542](file://dissensus-engine/server/index.js#L526-L542)

### Share Token Generation Mechanism
Share tokens enable anonymous access to debates:
- Generated as 16-character random strings using crypto.randomUUID()
- Automatically sets debate visibility to 'shared'
- Stored in the debate index with share_token field
- Anonymous users can access debates via URL with share parameter
- Tokens are validated for length (exactly 16 characters)

```mermaid
sequenceDiagram
participant U as "User"
participant F as "Frontend"
participant B as "Backend"
participant S as "Store"
U->>F : "Click Generate Share Link"
F->>B : "POST /api/debate/ : id/share"
B->>S : "generateShareToken(id, userId)"
S->>S : "Create 16-char token"
S->>S : "Set visibility = 'shared'"
S-->>B : "Return token"
B-->>F : "JSON { shareToken : token }"
F->>F : "Build share URL with token"
F->>U : "Copy to clipboard"
```

**Diagram sources**
- [app.js:794-811](file://dissensus-engine/public/js/app.js#L794-L811)
- [debate-store.js:100-106](file://dissensus-engine/server/debate-store.js#L100-L106)
- [index.js:537-542](file://dissensus-engine/server/index.js#L537-L542)

**Section sources**
- [app.js:794-811](file://dissensus-engine/public/js/app.js#L794-L811)
- [debate-store.js:100-106](file://dissensus-engine/server/debate-store.js#L100-L106)
- [index.js:537-542](file://dissensus-engine/server/index.js#L537-L542)

### Workspace Management Integration
The system integrates with workspace management for team collaboration:
- Users can create workspaces and invite members
- Debate ownership is tracked with workspace association
- Workspace members can access debates within their workspaces
- Member roles determine access permissions
- Workspaces enable collaborative debate management

```mermaid
flowchart TD
User["User"] --> CreateWS["Create Workspace"]
CreateWS --> Invite["Invite Members"]
Invite --> Access["Members gain access"]
Access --> Debates["Access workspace debates"]
Debates --> Collaboration["Collaborative debate management"]
```

**Diagram sources**
- [workspace.js:4-10](file://dissensus-engine/server/workspace.js#L4-L10)
- [index.js:302-329](file://dissensus-engine/server/index.js#L302-L329)

**Section sources**
- [workspace.js:4-10](file://dissensus-engine/server/workspace.js#L4-L10)
- [index.js:302-329](file://dissensus-engine/server/index.js#L302-L329)

### API Endpoint Protection
- POST /api/debate/validate: Validates topic length, model, and API key presence. Returns 200 on success or 400 with an error message.
- GET /api/debate/stream: Validates inputs, sets SSE headers, streams debate events, and records metrics on completion or error.
- POST /api/debate/:id/visibility: Requires authentication and ownership verification for toggling debate visibility.
- POST /api/debate/:id/share: Requires authentication and ownership verification for generating share tokens.
- Rate limiting: Applied to debate and card endpoints to prevent abuse.
- CSRF protection: Implemented for sensitive operations like visibility changes and share generation.

```mermaid
sequenceDiagram
participant F as "Frontend"
participant B as "Backend"
participant R as "Rate Limiter"
participant A as "Auth Middleware"
F->>B : "POST /api/debate/validate"
B->>R : "Check rate limit"
R-->>B : "Allow or block"
B-->>F : "200 OK or 400 error"
F->>B : "GET /api/debate/stream"
B->>R : "Check rate limit"
R-->>B : "Allow or block"
B-->>F : "SSE stream"
F->>B : "POST /api/debate/ : id/visibility"
B->>A : "Verify authentication"
A-->>B : "User verified"
B->>R : "Check rate limit"
R-->>B : "Allow or block"
B-->>F : "Success or 403 error"
```

**Diagram sources**
- [index.js:124-230](file://dissensus-engine/server/index.js#L124-L230)
- [index.js:526-542](file://dissensus-engine/server/index.js#L526-L542)

**Section sources**
- [index.js:47-53](file://dissensus-engine/server/index.js#L47-L53)
- [index.js:124-230](file://dissensus-engine/server/index.js#L124-L230)
- [index.js:526-542](file://dissensus-engine/server/index.js#L526-L542)

### Integration with Debate Initiation
- The frontend calls /api/debate/validate before connecting to /api/debate/stream to avoid exposing 400 errors via EventSource.
- The wallet (when present) is passed to both endpoints to support enforcement mode and limit tracking.
- After debate completion, visibility controls become available for logged-in users.

```mermaid
sequenceDiagram
participant UI as "Frontend"
participant API as "Backend"
participant ENG as "DebateEngine"
UI->>API : "POST /api/debate/validate {wallet?}"
API-->>UI : "OK or error"
UI->>API : "GET /api/debate/stream {wallet?}"
API->>ENG : "runDebate(topic)"
ENG-->>API : "Events"
API-->>UI : "SSE stream"
UI->>UI : "Show visibility/share controls"
```

**Diagram sources**
- [app.js:274-300](file://dissensus-engine/public/js/app.js#L274-L300)
- [index.js:156-230](file://dissensus-engine/server/index.js#L156-L230)
- [debate-engine.js:121-386](file://dissensus-engine/server/debate-engine.js#L121-L386)

**Section sources**
- [app.js:274-300](file://dissensus-engine/public/js/app.js#L274-L300)
- [index.js:156-230](file://dissensus-engine/server/index.js#L156-L230)

### Enforcement Mode (STAKING_ENFORCE=1)
- When enabled, the frontend requires a wallet and passes it to validation and streaming endpoints.
- The backend's preflight and stream endpoints validate inputs and rely on the frontend to supply a wallet when enforced.
- Daily debate limits are enforced by the frontend's staking status queries and UI messaging.

```mermaid
flowchart TD
Env["Set STAKING_ENFORCE=1 in .env"] --> ReadCfg["Frontend reads /api/config"]
ReadCfg --> Enf{"Enforcement enabled?"}
Enf --> |Yes| RequireWallet["Require wallet input"]
Enf --> |No| OptionalWallet["Optional wallet input"]
RequireWallet --> PassWallet["Pass wallet to /api/debate/validate and /api/debate/stream"]
OptionalWallet --> PassWallet
```

**Diagram sources**
- [README.md:88-90](file://dissensus-engine/README.md#L88-L90)
- [index.js:58-67](file://dissensus-engine/server/index.js#L58-L67)
- [app.js:642-655](file://dissensus-engine/public/js/app.js#L642-L655)

**Section sources**
- [README.md:88-90](file://dissensus-engine/README.md#L88-L90)
- [index.js:58-67](file://dissensus-engine/server/index.js#L58-L67)
- [app.js:642-655](file://dissensus-engine/public/js/app.js#L642-L655)

### Simulation vs. Production Behavior
- Simulation: The frontend exposes endpoints to simulate staking and unstaking, and to query staking status. This is intended for demos.
- Production: On-chain verification replaces simulation. The API surface remains unchanged, enabling seamless migration.

```mermaid
flowchart TD
Sim["Simulation Mode"] --> SimEndpoints["POST /api/staking/stake<br/>POST /api/staking/unstake<br/>GET /api/staking/status"]
Prod["Production Mode"] --> OnChain["On-chain staking program"]
SimEndpoints --> UI["Frontend UI"]
OnChain --> UI
```

**Diagram sources**
- [README.md:78-90](file://dissensus-engine/README.md#L78-L90)
- [app.js:517-554](file://dissensus-engine/public/js/app.js#L517-L554)

**Section sources**
- [README.md:78-90](file://dissensus-engine/README.md#L78-L90)
- [app.js:517-554](file://dissensus-engine/public/js/app.js#L517-L554)

### Examples of Access Control Checks
- Topic validation: Minimum length, maximum length, and provider/model validation occur in preflight and stream endpoints.
- API key validation: Either user-provided or server-side key is required depending on configuration.
- Rate limiting: Applied to debate and card endpoints to protect resources.
- Visibility access control: Authentication required for visibility changes and share token generation.
- Workspace access control: Member-only access to workspace-associated debates.

**Updated** Added visibility and workspace access control examples.

**Section sources**
- [index.js:124-190](file://dissensus-engine/server/index.js#L124-L190)
- [index.js:249-291](file://dissensus-engine/server/index.js#L249-L291)
- [index.js:526-542](file://dissensus-engine/server/index.js#L526-L542)

## Dependency Analysis
- Frontend depends on backend endpoints for configuration, staking, debate orchestration, and visibility management.
- Backend depends on the debate engine for execution, debate store for persistence, and rate limiting for protection.
- Debate store depends on database for data persistence and provides visibility state management.
- Workspace management integrates with user authentication and debate ownership tracking.
- Environment variables control server-side keys and enforcement behavior.

```mermaid
graph LR
APP["public/js/app.js"] --> CFG["/api/config"]
APP --> VAL["/api/debate/validate"]
APP --> STR["/api/debate/stream"]
APP --> TIER["/api/staking/tiers"]
APP --> STAT["/api/staking/status"]
APP --> VIS["/api/debate/:id/visibility"]
APP --> SHARE["/api/debate/:id/share"]
CFG --> SRV["server/index.js"]
VAL --> SRV
STR --> SRV
VIS --> SRV
SHARE --> SRV
TIER --> SRV
STAT --> SRV
SRV --> DE["server/debate-engine.js"]
SRV --> DS["server/debate-store.js"]
DS --> DB["server/db.js"]
SRV --> WS["server/workspace.js"]
SRV --> RL["express-rate-limit"]
```

**Diagram sources**
- [app.js:642-674](file://dissensus-engine/public/js/app.js#L642-L674)
- [index.js:58-230](file://dissensus-engine/server/index.js#L58-L230)
- [debate-engine.js:41-387](file://dissensus-engine/server/debate-engine.js#L41-L387)
- [debate-store.js:16-32](file://dissensus-engine/server/debate-store.js#L16-L32)
- [workspace.js:1-39](file://dissensus-engine/server/workspace.js#L1-L39)
- [package.json:10-19](file://dissensus-engine/package.json#L10-L19)

**Section sources**
- [package.json:10-19](file://dissensus-engine/package.json#L10-L19)
- [index.js:58-230](file://dissensus-engine/server/index.js#L58-L230)

## Performance Considerations
- Rate limiting reduces abuse and protects downstream providers.
- SSE streaming avoids buffering large payloads and supports real-time updates.
- Preflight validation prevents wasted compute on invalid requests.
- Database indexing supports efficient debate listing and visibility queries.
- Share token generation uses efficient random string creation.

**Updated** Added considerations for new visibility and share token functionality.

## Troubleshooting Guide
- Validation errors: Check topic length and model/provider correctness in preflight responses.
- API key issues: Ensure a valid key is provided or server-side key is configured.
- Rate limit exceeded: Wait for the next window or adjust usage.
- Wallet requirement: When STAKING_ENFORCE is enabled, ensure a valid wallet is saved and passed to endpoints.
- Visibility errors: Ensure you're logged in and own the debate when trying to change visibility.
- Share token issues: Verify the debate exists and you have permission to modify it.
- Workspace access: Ensure you're a member of the workspace containing the debate.

**Updated** Added troubleshooting guidance for new visibility and workspace features.

**Section sources**
- [index.js:124-190](file://dissensus-engine/server/index.js#L124-L190)
- [app.js:274-300](file://dissensus-engine/public/js/app.js#L274-L300)

## Conclusion
The access control system integrates frontend-driven preflight checks with backend validations and rate limiting. Staking tiers and enforcement mode shape user experience by gating features and debates. In simulation mode, the frontend exposes staking endpoints for demos; production readiness is achieved by replacing simulation with on-chain verification while preserving the same API surface.

**Updated** Enhanced conclusion to reflect the expanded access control capabilities including debate visibility states, share token generation, and workspace management integration. The system now provides granular access control for individual debates and enables anonymous sharing while maintaining security through authentication requirements for sensitive operations.