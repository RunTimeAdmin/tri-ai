# Dissensus — Product Roadmap

> **Vision:** AI-powered dialectical debate platform. Three AI agents engage in structured, truth-seeking argumentation to analyze complex topics from multiple perspectives.

---

## Overview

| Phase | Focus | Timeline |
|-------|-------|----------|
| **1** | Launch & Community | Q3 2025 → Q1 2026 (Completed) |
| **2** | Platform Live | Q2–Q3 2026 (Current) |
| **3** | Premium Features | Q3–Q4 2026 |
| **4** | Scale & Ecosystem | Q4 2026+ |

---

## Phase 1 — Launch & Community

**Goal:** Brand awareness, community growth, platform beta.

### Website & Brand
- [x] dissensus.fun landing page — done
- [x] Dissensus branding and positioning
- [x] "3 AI Minds. 1 Truth." positioning
- [x] Launch App CTAs
- [ ] Final social links

### Community
- [ ] X/Twitter: @dissensus or similar
- [ ] Community growth campaign

### Infrastructure
- [x] VPS deployment — done
- [x] SSL/HTTPS — done

### Status
**Completed:** Landing page live. App deployed on VPS (app.dissensus.fun). SSL/HTTPS configured.

---

## Phase 2 — Platform Live

**Goal:** Dissensus AI debate engine fully operational.

### App (dissensus-engine)
- [x] VPS deployment (app.dissensus.fun)
- [x] DeepSeek integration (server-side API key)
- [x] Production hardening (rate limit, security, graceful shutdown)
- [x] API key security hardened (server-side only)
- [x] Topic input sanitization (prompt injection prevention)
- [x] Debate persistence with shareable permalinks
- [x] Repository cleanup (removed duplicate deployments)
- [ ] Dissensus branding in app UI
- [ ] User accounts and saved debates (upcoming)
- [ ] Premium features exploration

### Website
- [x] DNS: app.dissensus.fun → VPS
- [x] SSL verified
- [x] Landing → App flow tested

### Product
- [x] Three agents live (CIPHER, NOVA, PRISM)
- [x] 4-phase debate working end-to-end
- [ ] First community debates (showcase/case studies)

### Future Provider Expansion
- [ ] Gemini integration (if needed)
- [ ] OpenAI integration (if needed)

### Status
**Current:** Q2–Q3 2026. Core platform operational; user features in development.

---

## Phase 3 — Premium Features

**Goal:** Advanced features for power users.

### Premium Features
- [ ] Deep Research Mode (web search + debate)
- [ ] Custom agent personalities (user-defined roles)
- [ ] Private debate sessions (save/share)
- [ ] API access for developers

### Growth
- [ ] Mobile-optimized UI
- [ ] Partnerships and integrations
- [ ] Developer documentation

### Status
**Target:** Q3–Q4 2026.

---

## Phase 4 — Scale & Ecosystem

**Goal:** Platform maturity and ecosystem expansion.

### Platform Evolution
- [ ] Community voting on new agent personalities
- [ ] Community voting on platform features
- [ ] Community voting on provider/model additions

### Economics
- [ ] Sustainable revenue model
- [ ] Developer incentive program

### Scale
- [ ] Dissensus as standard for AI-powered analysis
- [ ] B2B / white-label potential

### Status
**Target:** Q4 2026 and beyond.

---

## Technical Milestones

| Milestone | Status |
|-----------|--------|
| Landing page live (Hostinger) | Ready |
| App on VPS (app.dissensus.fun) | Ready |
| DNS + SSL for app subdomain | Done |
| Server-side DeepSeek API key | Ready |
| Rate limiting, security headers | Done |
| Dissensus branding in app | Pending |
| User accounts | Phase 2 |
| Premium features | Phase 3 |

---

## Quick Reference

**Website:** dissensus.fun (Hostinger)  
**App:** app.dissensus.fun (Hostinger VPS)

**Next steps:**
1. Set DNS: app.dissensus.fun → VPS IP
2. Add Dissensus branding to dissensus-engine
3. Go live and start community growth
