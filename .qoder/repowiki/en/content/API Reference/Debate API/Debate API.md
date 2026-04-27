# Debate API

<cite>
**Referenced Files in This Document**
- [index.js](file://dissensus-engine/server/index.js)
- [debate-engine.js](file://dissensus-engine/server/debate-engine.js)
- [debate-store.js](file://dissensus-engine/server/debate-store.js)
- [metrics.js](file://dissensus-engine/server/metrics.js)
- [agents.js](file://dissensus-engine/server/agents.js)
- [app.js](file://dissensus-engine/public/js/app.js)
- [nginx-dissensus.conf](file://dissensus-engine/docs/configs/nginx-dissensus.conf)
</cite>

## Update Summary
**Changes Made**
- Added new debate persistence endpoints documentation
- Enhanced validation section with sanitizeTopic() implementation
- Updated API key security model documentation
- Added debate storage and retrieval endpoints
- Updated streaming implementation with debate persistence

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [API Reference](#api-reference)
7. [Rate Limiting and Policies](#rate-limiting-and-policies)
8. [Input Validation Rules](#input-validation-rules)
9. [Streaming Implementation](#streaming-implementation)
10. [Error Handling](#error-handling)
11. [Integration Patterns](#integration-patterns)
12. [Performance Considerations](#performance-considerations)
13. [Troubleshooting Guide](#troubleshooting-guide)
14. [Conclusion](#conclusion)

## Introduction

The Dissensus AI Debate API provides a sophisticated real-time debate system that simulates structured discussions between three AI agents (CIPHER, NOVA, and PRISM) on any given topic. The system supports multiple AI providers (OpenAI, DeepSeek, Google Gemini) and delivers content through Server-Sent Events (SSE) for seamless real-time streaming.

The debate system follows a four-phase dialectical process: Independent Analysis, Opening Arguments, Cross-Examination, and Final Verdict. Each phase produces structured content that culminates in a comprehensive synthesis delivered by the PRISM agent.

**Updated** Added comprehensive debate persistence capabilities with secure storage and retrieval endpoints.

## Project Structure

The debate system is built as a Node.js Express application with the following key components:

```mermaid
graph TB
subgraph "Server Layer"
API[API Routes]
Engine[Debate Engine]
Store[Debate Store]
Metrics[Metrics & Analytics]
end
subgraph "Client Layer"
Frontend[Web Frontend]
SSE[Server-Sent Events]
UI[Real-time UI Updates]
end
subgraph "External Services"
Providers[AI Providers]
FS[File System Storage]
Coingecko[CoinGecko API]
end
Frontend --> API
API --> Engine
API --> Store
API --> Metrics
Engine --> Providers
Store --> FS
API --> Coingecko
Engine --> SSE
SSE --> UI
```

**Diagram sources**
- [index.js:1-382](file://dissensus-engine/server/index.js#L1-L382)
- [debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [debate-store.js:1-83](file://dissensus-engine/server/debate-store.js#L1-L83)

**Section sources**
- [index.js:1-382](file://dissensus-engine/server/index.js#L1-L382)
- [debate-engine.js:1-399](file://dissensus-engine/server/debate-engine.js#L1-L399)
- [debate-store.js:1-83](file://dissensus-engine/server/debate-store.js#L1-L83)

## Core Components

### Debate Engine
The core debate orchestration system that coordinates the four-phase debate process between three specialized AI agents.

### Provider Configuration
Supports multiple AI providers with their respective API endpoints, authentication methods, and model specifications.

### Debate Persistence System
Secure storage and retrieval system for completed debates with automatic ID generation and file-based storage.

### Real-time Streaming
Server-Sent Events implementation that streams debate progress in real-time to clients.

**Updated** Added debate persistence system with secure file-based storage and retrieval endpoints.

**Section sources**
- [debate-engine.js:41-399](file://dissensus-engine/server/debate-engine.js#L41-L399)
- [index.js:14-85](file://dissensus-engine/server/index.js#L14-L85)
- [debate-store.js:14-83](file://dissensus-engine/server/debate-store.js#L14-L83)

## Architecture Overview

The debate system follows a layered architecture with clear separation of concerns:

```mermaid
sequenceDiagram
participant Client as "Client Application"
participant API as "API Gateway"
participant Validator as "Validation Layer"
participant Engine as "Debate Engine"
participant Store as "Debate Store"
participant Provider as "AI Provider"
participant SSE as "SSE Stream"
Client->>API : POST /api/debate/validate
API->>Validator : Validate parameters
Validator-->>API : Validation result
API-->>Client : {ok : true} or error
Client->>API : GET /api/debate/stream
API->>Engine : Initialize debate
Engine->>Provider : Send API request
Provider-->>Engine : Stream response chunks
Engine->>SSE : Emit structured events
Engine->>Store : Persist debate data
SSE-->>Client : Real-time debate updates
Client->>API : GET /api/debate/ : id
API->>Store : Retrieve debate by ID
Store-->>API : Debate data
API-->>Client : Complete debate transcript
```

**Diagram sources**
- [index.js:177-311](file://dissensus-engine/server/index.js#L177-L311)
- [debate-engine.js:121-396](file://dissensus-engine/server/debate-engine.js#L121-L396)
- [debate-store.js:19-33](file://dissensus-engine/server/debate-store.js#L19-L33)

## Detailed Component Analysis

### Debate Engine Implementation

The DebateEngine class orchestrates the complete debate lifecycle through four distinct phases:

```mermaid
classDiagram
class DebateEngine {
+string apiKey
+object provider
+string providerName
+string model
+string baseUrl
+constructor(apiKey, provider, model)
+callAgent(agentId, messages, onChunk) Promise~string~
+runDebate(topic, sendEvent) Promise~object~
}
class Agent {
+string id
+string name
+string role
+string subtitle
+string color
+string portrait
+string systemPrompt
}
class ProviderConfig {
+string baseUrl
+object models
+function authHeader(key)
}
DebateEngine --> Agent : "coordinates"
DebateEngine --> ProviderConfig : "uses"
```

**Diagram sources**
- [debate-engine.js:41-53](file://dissensus-engine/server/debate-engine.js#L41-L53)
- [agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)

### Four-Phase Debate Process

The system implements a structured dialectical process:

1. **Phase 1: Independent Analysis** - Each agent analyzes the topic privately
2. **Phase 2: Opening Arguments** - Formal positions presented
3. **Phase 3: Cross-Examination** - Agents challenge each other's arguments
4. **Phase 4: Final Verdict** - PRISM delivers synthesized conclusion

**Section sources**
- [debate-engine.js:121-396](file://dissensus-engine/server/debate-engine.js#L121-L396)
- [agents.js:8-148](file://dissensus-engine/server/agents.js#L8-L148)

## API Reference

### Debate Validation Endpoint

**Endpoint**: `POST /api/debate/validate`

**Purpose**: Pre-flight validation to check debate parameters before initiating streaming.

**Request Body**:
```javascript
{
  "topic": "string",           // Required - Debate topic
  "provider": "string",        // Optional - Provider name
  "model": "string"            // Optional - Model identifier
}
```

**Response**:
- Success: `{ "ok": true }`
- Validation Error: `{ "error": "validation message" }`

**Section sources**
- [index.js:142-166](file://dissensus-engine/server/index.js#L142-L166)

### Debate Streaming Endpoint

**Endpoint**: `GET /api/debate/stream`

**Purpose**: Initiates real-time debate streaming with structured events and persists debate data.

**Query Parameters**:
- `topic` (required): Debate topic string
- `provider` (optional): AI provider name
- `model` (optional): Model identifier

**Response**: Server-Sent Events stream with structured JSON messages and automatic debate persistence.

**Updated** Enhanced with debate persistence - debates are automatically saved with generated IDs and stored in JSON format.

**Section sources**
- [index.js:183-256](file://dissensus-engine/server/index.js#L183-L256)

### Debate Persistence Endpoints

**Get Specific Debate**: `GET /api/debate/:id`

**Purpose**: Retrieve a previously completed debate by its unique ID.

**Path Parameters**:
- `id` (required): Unique debate identifier (UUID format)

**Response**:
- Success: Complete debate transcript with all phases
- Not Found: `{ "error": "Debate not found" }`

**Get Recent Debates**: `GET /api/debates/recent`

**Purpose**: Retrieve metadata for recently completed debates.

**Query Parameters**:
- `limit` (optional): Maximum number of debates (default: 20, max: 50)

**Response**: Array of debate metadata objects containing ID, topic preview, provider, and timestamp.

**Section sources**
- [index.js:169-178](file://dissensus-engine/server/index.js#L169-L178)
- [debate-store.js:35-80](file://dissensus-engine/server/debate-store.js#L35-L80)

## Rate Limiting and Policies

### Debate Rate Limits
- **Production**: 10 debates per minute per IP
- **Development**: 100 debates per minute per IP
- **Error Response**: `{ "error": "Too many debates. Please wait a minute and try again." }`

### Provider-Specific Rate Limits
- **Solana Balance**: 60 requests per minute
- **Staking Operations**: 60-200 requests per minute (varies by endpoint)
- **Metrics Access**: 120-300 requests per minute

### Staking Enforcement
When `STAKING_ENFORCE=true` is configured:
- Wallet address becomes mandatory for all debates
- Daily debate limits enforced based on staking tiers
- Wallet validation performed against Solana address format

**Section sources**
- [index.js:66-72](file://dissensus-engine/server/index.js#L66-L72)
- [index.js:90-96](file://dissensus-engine/server/index.js#L90-L96)
- [index.js:316-322](file://dissensus-engine/server/index.js#L316-L322)
- [index.js:421-427](file://dissensus-engine/server/index.js#L421-L427)

## Input Validation Rules

### Topic Validation with Sanitization

**Enhanced** Added comprehensive topic sanitization to prevent prompt injection attacks and strip malicious content.

The `sanitizeTopic()` function performs the following validations:
- **Required**: Non-empty string
- **Minimum Length**: 3 characters
- **Maximum Length**: 500 characters
- **Control Character Removal**: Strips ASCII control characters (0x00-0x1F, 0x7F)
- **Prompt Injection Prevention**: Removes system prompt manipulation sequences
- **Format Normalization**: Trims whitespace and validates final sanitized output

**Sanitization Rules**:
- Removes control characters: `[\x00-\x1F\x7F]`
- Strips system prompt manipulation: `\b(system|assistant|user)\s*:`
- Removes code block markers: `/\`\`\`/g`
- Strips <|...|> injection sequences
- Validates final output is non-empty

### Provider Validation
- **Supported Providers**: `openai`, `deepseek`, `gemini`
- **Default Provider**: `deepseek`
- **Provider Detection**: Case-insensitive with fallback logic

### Model Validation
- **Model Selection Priority**: Explicit model > Provider default > Fallback
- **Provider Defaults**: 
  - DeepSeek: `deepseek-chat`
  - Gemini: `gemini-2.0-flash`
  - OpenAI: `gpt-4o`

### API Key Security Model

**Enhanced** Implemented server-side API key security model for improved security and quota management.

**Security Features**:
- **Server-only Keys**: API keys are always loaded from server-side environment variables
- **Client Isolation**: Client requests never provide or influence API key selection
- **Key Resolution**: Effective keys are resolved server-side based on provider configuration
- **Quota Protection**: Prevents client-side key bypass attempts

**Configuration Requirements**:
- Keys: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` in server `.env`
- Automatic availability detection for client configuration

**Section sources**
- [index.js:37-53](file://dissensus-engine/server/index.js#L37-L53)
- [index.js:120-128](file://dissensus-engine/server/index.js#L120-L128)
- [index.js:130-137](file://dissensus-engine/server/index.js#L130-L137)
- [index.js:142-166](file://dissensus-engine/server/index.js#L142-L166)

## Streaming Implementation

### SSE Event Types

The debate system emits structured events with the following types:

```mermaid
flowchart TD
Start["debate-start"] --> Phase1["phase-start (phase: 1)"]
Phase1 --> Agent1["agent-start (agent: cipher)"]
Agent1 --> Chunk1["agent-chunk (agent: cipher)"]
Chunk1 --> Done1["agent-done (agent: cipher)"]
Done1 --> Agent2["agent-start (agent: nova)"]
Agent2 --> Chunk2["agent-chunk (agent: nova)"]
Chunk2 --> Done2["agent-done (agent: nova)"]
Done2 --> Agent3["agent-start (agent: prism)"]
Agent3 --> Chunk3["agent-chunk (agent: prism)"]
Chunk3 --> Done3["agent-done (agent: prism)"]
Done3 --> Phase2["phase-start (phase: 2)"]
Phase2 --> Cross["phase-done (phase: 1)"]
Cross --> Phase3["phase-start (phase: 3)"]
Phase3 --> Phase4["phase-start (phase: 4)"]
Phase4 --> Verdict["debate-done (verdict)"]
Verdict --> Done["[DONE]"]
```

**Diagram sources**
- [debate-engine.js:130-132](file://dissensus-engine/server/debate-engine.js#L130-L132)

### Event Structure

Each SSE event follows this JSON structure:
```javascript
{
  "type": "event-type",
  "phase": 1,                    // For phase-related events
  "agent": "cipher",             // For agent-specific events
  "chunk": "text content",       // For streaming content
  "topic": "debate topic",       // For debate metadata
  "provider": "openai",          // For provider info
  "model": "gpt-4o",             // For model info
  "message": "error message"     // For error events
}
```

### Client Implementation Pattern

The frontend demonstrates proper SSE handling:

```mermaid
sequenceDiagram
participant Client as "Client"
participant Fetch as "Fetch API"
participant SSE as "SSE Stream"
participant Parser as "Event Parser"
Client->>Fetch : GET /api/debate/stream
Fetch->>SSE : Establish connection
SSE->>Parser : Receive data chunks
Parser->>Parser : Parse JSON events
Parser->>Client : Update UI state
Parser->>Client : Handle [DONE] termination
```

**Diagram sources**
- [app.js:294-347](file://dissensus-engine/public/js/app.js#L294-L347)

**Updated** Enhanced with debate persistence - debates are automatically saved with unique IDs and can be retrieved later.

**Section sources**
- [debate-engine.js:130-396](file://dissensus-engine/server/debate-engine.js#L130-L396)
- [app.js:358-427](file://dissensus-engine/public/js/app.js#L358-L427)

## Error Handling

### Validation Errors
- **Missing Topic**: `"Missing topic"`
- **Topic Too Short**: `"Topic must be at least 3 characters"`
- **Topic Too Long**: `"Topic must be 500 characters or less"`
- **Invalid Provider**: `"Unknown provider: {provider}"`
- **Invalid Model**: `"Invalid model "{model}" for {provider}"`
- **Missing API Key**: `"API key required. Set {PROVIDER}_API_KEY in server .env"`

### Runtime Errors
- **Provider API Errors**: Propagated with provider context
- **Network Issues**: Connection timeouts and retry logic
- **Client Disconnection**: Graceful cleanup and resource release

### Rate Limiting Errors
- **Response**: `{ "error": "Too many debates. Please wait a minute and try again." }`
- **HTTP Status**: 429 Too Many Requests
- **Headers**: Standard rate limit headers included

**Section sources**
- [index.js:194-212](file://dissensus-engine/server/index.js#L194-L212)
- [index.js:303-310](file://dissensus-engine/server/index.js#L303-L310)

## Integration Patterns

### Client-Side Integration

The frontend demonstrates several integration patterns:

1. **Preflight Validation**: Always validate before starting debate
2. **SSE Connection Management**: Proper connection lifecycle handling
3. **Error Recovery**: Graceful error handling and user feedback
4. **State Management**: Real-time UI updates synchronized with events

### Server Configuration Requirements

For production deployment, proper reverse proxy configuration is essential:

```nginx
location /api/debate/stream {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection '';
    
    # CRITICAL for SSE streaming
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
}
```

**Section sources**
- [app.js:209-356](file://dissensus-engine/public/js/app.js#L209-L356)
- [nginx-dissensus.conf:42-60](file://dissensus-engine/docs/configs/nginx-dissensus.conf#L42-L60)

## Performance Considerations

### Streaming Optimization
- **No Buffering**: Proxy configuration disables all buffering for SSE
- **Long Timeout**: 600-second timeout for extended debates
- **Chunked Transfer**: Maintains continuous data flow

### Resource Management
- **Memory Efficiency**: Streaming architecture prevents memory accumulation
- **Connection Limits**: Proper cleanup on client disconnect
- **Provider Throttling**: Respect upstream API rate limits

### Scalability Factors
- **Horizontal Scaling**: Stateless architecture supports multiple instances
- **Load Balancing**: SSE connections should be sticky for optimal performance
- **Caching**: Provider configuration and static assets cached appropriately

### Debate Persistence Performance
- **File System Storage**: Efficient JSON serialization for debate transcripts
- **ID Generation**: UUID-based unique identifiers for fast lookups
- **Metadata Indexing**: Timestamp-based sorting for recent debates listing

**Section sources**
- [debate-store.js:19-33](file://dissensus-engine/server/debate-store.js#L19-L33)
- [debate-store.js:57-80](file://dissensus-engine/server/debate-store.js#L57-L80)

## Troubleshooting Guide

### Common Issues and Solutions

**Connection Problems**
- Verify reverse proxy configuration has `proxy_buffering off`
- Check network connectivity to AI provider APIs
- Ensure firewall allows outbound connections

**Rate Limiting Issues**
- Monitor rate limit headers in responses
- Implement exponential backoff for retries
- Consider server-side API key usage to reduce quotas

**Streaming Issues**
- Verify client handles SSE connection properly
- Check browser support for Server-Sent Events
- Ensure network doesn't terminate idle connections

**Persistence Issues**
- Verify data directory permissions for debate storage
- Check file system space for debate JSON files
- Ensure UUID format validation for debate retrieval

**Debugging Techniques**
- Enable detailed logging in development mode
- Monitor SSE event flow in browser developer tools
- Check server logs for error patterns
- Validate API keys and provider configuration

### Monitoring and Metrics

The system provides comprehensive metrics for monitoring:

- **Debate Statistics**: Total debates, daily counts, provider usage
- **Error Tracking**: Request success/failure rates
- **Staking Metrics**: Tier distribution and usage patterns
- **Real-time Dashboard**: Live metrics for operational visibility

**Section sources**
- [metrics.js:100-112](file://dissensus-engine/server/metrics.js#L100-L112)
- [nginx-dissensus.conf:326-344](file://dissensus-engine/docs/configs/nginx-dissensus.conf#L326-L344)

## Conclusion

The Dissensus AI Debate API provides a robust, scalable solution for real-time structured debate generation with comprehensive persistence capabilities. Its modular architecture, enhanced validation system with sanitization, and efficient streaming implementation make it suitable for production deployment while maintaining excellent developer experience.

Key strengths include:
- **Real-time Streaming**: Seamless SSE implementation for immediate feedback
- **Multi-provider Support**: Flexible integration with major AI providers
- **Structured Output**: Predictable event-driven interface for reliable client integration
- **Enhanced Security**: Server-side API key management prevents unauthorized access
- **Comprehensive Persistence**: Secure debate storage with retrieval capabilities
- **Production Ready**: Comprehensive error handling, rate limiting, and monitoring
- **Extensible Design**: Modular components support easy customization and enhancement

The system successfully balances performance, reliability, and developer usability while providing a compelling foundation for AI-powered debate applications with persistent storage capabilities.