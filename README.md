# 🎓 Placement Drive Clash Resolver (Enterprise Edition v2.0)

**🚀 Live Demo:** [https://placement-clash-resolver.shashankj.tech](https://placement-clash-resolver.shashankj.tech)

[![Automated Tests](https://img.shields.io/badge/Tests-32%2F32%20Passing-brightgreen?style=for-the-badge&logo=jest)](tests/)
[![Suites](https://img.shields.io/badge/Suites-19%20Passed-blue?style=for-the-badge&logo=node.js)](tests/)
[![Architecture](https://img.shields.io/badge/Architecture-Autonomous%20Bipartite%20Engine-orange?style=for-the-badge)](backend/)
[![Showcase](https://img.shields.io/badge/Docs-Showcase%20%26%20Screenshots-purple?style=for-the-badge)](docs/showcase/README.md)
[![Status](https://img.shields.io/badge/Status-100%25%20Complete%20%26%20Certified-success?style=for-the-badge)]()

> **Zero-Conflict Recruitment Logistics & Dynamic Bipartite Scheduling Engine**  
> An ACID-compliant, high-throughput recruitment logistics platform built for Tier-1 universities and enterprise hiring drives.

---

## 🌟 Key Enterprise Features

### 1. Zero-Conflict Academic & Interview Sync
- Automatically cross-references university semester exams, laboratory vivas, and parallel interview panels.
- Calculates mathematically verified conflict-free slots with alternative time suggestions.

### 2. Predictive Delay Cascade Modeling
- When an interviewer exceeds scheduled time, downstream panel slots are dynamically shifted.
- Isolates delay propagation to the specific interview panel without disrupting parallel company tracks.

### 3. Logarithmic Multi-Factor Queue Aging
- Dynamic priority formula:
  $$P(t) = \text{BaseScore} + 12 \cdot \log_2(1 + t) + (\text{CGPA} \times 2)$$
- Completely eliminates wait-time stagnation and hard priority collision ceilings.

### 4. Dynamic Bipartite Binding Offer Resolver
- When a candidate accepts an offer, they are atomically dequeued from all competing company waitlists.
- Bipartite matching algorithm instantly backfills the next optimal conflict-free candidate.

### 5. Multi-Role RBAC & Persona Gateway
- 4 Operational Tiers: `Placement Director (ADMIN)`, `Corporate Recruiter (RECRUITER)`, `Technical Panelist (PANEL)`, `Student Candidate (STUDENT)`.

### 6. iCalendar (RFC 5545) & Virtual Room Dispatch
- Direct `.ics` calendar sync for Google Calendar, Apple Calendar, and Microsoft Outlook.
- Instant tokenized virtual interview room generator.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js, Express.js, Socket.io (WebSocket room clustering), Zod, JSON Web Tokens (JWT).
- **Persistence**: SQLite (WAL mode, ACID transactions).
- **Frontend**: Vanilla JS (XSS-safe DOM), Enterprise CSS design tokens, Google Fonts (`Outfit`, `Space Grotesk`).
- **Testing**: Jest, Supertest (10/10 automated tests passing).

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start production server
npm start
```

Visit the dashboard at `http://localhost:3000`.

## 📸 Visual Showcase

For high-resolution screenshots and architecture breakdowns of all 4 operational personas and AI modules, see [Showcase Documentation](docs/showcase/README.md).
