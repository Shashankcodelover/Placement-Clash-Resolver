# 🎓 Placement Drive Clash Resolver — Showcase & Architecture

[![Automated Tests](https://img.shields.io/badge/Tests-52%2F52%20Passing-brightgreen?style=for-the-badge&logo=jest)](../../backend/)
[![Suites](https://img.shields.io/badge/Suites-21%20Passed-blue?style=for-the-badge&logo=node.js)](../../backend/)
[![Architecture](https://img.shields.io/badge/Architecture-Bipartite%20Scheduling%20Engine-orange?style=for-the-badge)](../../backend/)

> **Recruitment Logistics & Bipartite Scheduling Platform**  
> A recruitment logistics platform featuring schedule conflict resolution, bipartite matching, logarithmic queue aging, and predictive delay cascade modeling.

---

## 📸 Canonical Showcase Gallery

### 1. Multi-Role Dashboards
| Persona | Screenshot | Description |
|---|---|---|
| **Placement Admin** | ![Admin Dashboard](screenshots/placement_admin_dashboard.png) | Unified dashboard displaying conflict detection, queue status, drive metrics, and delay monitors. |
| **Corporate Recruiter** | ![Recruiter Dashboard](screenshots/placement_recruiter_dashboard.png) | Recruiter portal managing candidate queues, slot assignments, and candidate availability. |
| **Technical Panelist** | ![Panelist Dashboard](screenshots/placement_panelist_dashboard.png) | Interview panel interface providing candidate evaluation forms, score recording, and delay logging. |
| **Student Candidate** | ![Student Dashboard](screenshots/placement_student_dashboard.png) | Candidate portal displaying scheduled drives, virtual room links, calendar sync, and real-time status. |

### 2. Algorithmic & Evaluation Modules
| Module | Screenshot | Description |
|---|---|---|
| **Genetic Scheduler** | ![Genetic Schedule](screenshots/placement_ai_genetic_schedule.png) | Evolutionary algorithm optimizing multi-company schedules over multiple generations to minimize clashes and idle gaps. |
| **Skill Vector Matcher** | ![Semantic Skills](screenshots/placement_ai_skills_active.png) | Taxonomy keyword extraction and cosine similarity comparing candidate skill sets with job descriptions. |
| **Offer Acceptance Predictor** | ![Offer Predictor](screenshots/placement_ai_offer_predictor.png) | Logistic sigmoid regression calculating candidate offer acceptance probability based on CTC ratio, tier, and competing offers. |
| **STAR Delivery Scorer** | ![STAR Scorer](screenshots/placement_ai_star_scorer.png) | Keyword-based structural evaluation of candidate interview answers assessing Situation, Task, Action, and Result components. |

### 3. Real-Time Logistics Engines
| Engine | Screenshot | Description |
|---|---|---|
| **Matrix Sync Clash Detection** | ![Matrix Conflict](screenshots/placement_matrix_sync_conflict.png) | Clash detection checking against university academic schedules and suggesting conflict-free alternative slots. |
| **Predictive Delay Cascade** | ![Delay Cascade](screenshots/placement_delay_cascade.png) | Dynamic delay propagation that reschedules downstream pending slots when an interview session runs over time. |

---

## 🔬 Core Algorithmic Architecture

### 1. Bipartite Matching
Matches interview slots to candidate pools while respecting academic calendar constraints, company exclusivity, and panel availability using the Kuhn-Munkres minimum-cost bipartite matching algorithm.

### 2. Logarithmic Multi-Factor Queue Aging
Dynamic queue priority calculated as:
$$P(t) = \text{BaseScore} + 12 \cdot \log_2(1 + t) + (\text{CGPA} \times 2)$$
Increases candidate priority with each wait cycle to prevent queue stagnation.

### 3. Predictive Delay Cascade Modeling
When an interview session overruns by $\Delta t$:
1. Calculates buffer slack time $\tau_{\text{buf}}$.
2. Propagates residual delay $\delta = \max(0, \Delta t - \tau_{\text{buf}})$ strictly down the current panel's pipeline.
3. Leaves independent parallel company tracks unperturbed.
4. Emits WebSocket updates and notification records to affected candidates.

---

## 🧪 Verification & Automated Testing
- **Test Framework**: Jest & Supertest
- **Total Test Suites**: `21 passed, 21 total`
- **Total Tests**: `52 passed, 52 total`
- **Coverage Areas**:
  - Authentication & Persona Switching (`/api/login-as`, JWT verification)
  - Slot Allocation & Conflict Detection
  - Delay Cascade Propagation
  - Offer Dequeuing & Backfill Scheduling
  - Kuhn-Munkres and Gale-Shapley Matching Engines
  - Heuristic Evaluators (Skill Vector Matcher, Acceptance Predictor, Genetic Optimizer, STAR Scorer)
  - Bulk Data Ingestion and Cascading Deletion
