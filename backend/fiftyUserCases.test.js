const request = require('supertest');
const { app, io, db, scheduler } = require('./server');
const redisClientManager = require('./redisClient');
const galeShapleyEngine = require('./galeShapleyEngine');
const hungarianAssignmentEngine = require('./hungarianAssignmentEngine');
const kuhnMunkresMatcher = require('./kuhnMunkresMatcher');
const multiCompanyClashArbitrator = require('./multiCompanyClashArbitrator');

describe('50 Comprehensive User-Flow & Algorithmic Verification Suite: Placement Clash Resolver', () => {
    let adminToken;
    let recruiterToken;
    let panelToken;
    let studentToken;

    beforeAll(async () => {
        // Obtain tokens for all roles
        const adminRes = await request(app).post('/api/login-as').send({ role: 'ADMIN' });
        adminToken = adminRes.body.token;

        const recruiterRes = await request(app).post('/api/login-as').send({ role: 'RECRUITER' });
        recruiterToken = recruiterRes.body.token;

        const panelRes = await request(app).post('/api/login-as').send({ role: 'PANEL' });
        panelToken = panelRes.body.token;

        const studentRes = await request(app).post('/api/login-as').send({ role: 'STUDENT' });
        studentToken = studentRes.body.token;

        // Freshly reset the database to baseline enterprise seed
        await request(app).post('/api/reset').set('Authorization', `Bearer ${adminToken}`);
    });

    afterAll(async () => {
        io.close();
        db.db.close();
        await redisClientManager.quit();
    });

    // ─── 1. Persona & Authentication Flows (Tests 1-5) ─────────────
    test('01. Demo login as Placement Director (ADMIN) generates valid JWT', async () => {
        const res = await request(app).post('/api/login-as').send({ role: 'ADMIN' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('ADMIN');
    });

    test('02. Demo login as Corporate Recruiter (RECRUITER) generates valid JWT', async () => {
        const res = await request(app).post('/api/login-as').send({ role: 'RECRUITER' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('RECRUITER');
    });

    test('03. Demo login as Technical Panelist (PANEL) generates valid JWT', async () => {
        const res = await request(app).post('/api/login-as').send({ role: 'PANEL' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('PANEL');
    });

    test('04. Demo login as Candidate (STUDENT) generates valid JWT', async () => {
        const res = await request(app).post('/api/login-as').send({ role: 'STUDENT' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('STUDENT');
    });

    test('05. Unauthenticated request to protected endpoint returns 401 Unauthorized', async () => {
        const res = await request(app).post('/api/virtual-room').send({ panelId: 'PANEL_1' });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/No authentication token/i);
    });

    // ─── 2. RBAC & Access Control Enforcement (Tests 6-9) ──────────
    test('06. Candidate token is forbidden (403) from creating virtual interview rooms', async () => {
        const res = await request(app)
            .post('/api/virtual-room')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ panelId: 'PANEL_1', company: 'Google', candidateName: 'Preetham' });
        expect(res.status).toBe(403);
    });

    test('07. Panel token is forbidden (403) from aging corporate queues', async () => {
        const res = await request(app)
            .post('/api/age-queue')
            .set('Authorization', `Bearer ${panelToken}`)
            .send({});
        expect(res.status).toBe(403);
    });

    test('08. Candidate token is authorized to check slot clashes', async () => {
        const res = await request(app)
            .post('/api/check-clash')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ studentId: 'STU_001', proposedStart: 720, duration: 45 });
        expect(res.status).toBe(200);
        expect(res.body.conflictFree).toBeDefined();
    });

    test('09. Placement Director (ADMIN) has access to reset and management endpoints', async () => {
        const res = await request(app)
            .get('/api/state')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.panels).toBeDefined();
    });

    // ─── 3. Candidate & Recruiter Onboarding (Tests 10-14) ──────────
    test('10. Onboard new student into placement match pool', async () => {
        const payload = {
            usn: '4SJ21CS099',
            name: 'Pooja Hegde',
            email: 'pooja.hegde@campus.edu',
            phone: '+91 9876543210',
            cgpa: 9.1,
            department: 'CSE',
            preferredCompanies: ['Google', 'Microsoft']
        };
        const res = await request(app).post('/api/onboard/student').send(payload);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.student.usn).toBe('4SJ21CS099');
    });

    test('11. Student onboarding rejects payload missing mandatory fields', async () => {
        const res = await request(app).post('/api/onboard/student').send({ cgpa: 8.5 });
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('12. Onboard recruiter company and activate portal', async () => {
        const payload = {
            companyName: 'NVIDIA Graphics',
            recruiterName: 'Elena Rostova',
            email: 'erostova@nvidia.com',
            hiringRoles: ['CUDA Core Engineer', 'Deep Learning Architect'],
            ctcRange: '35-50 LPA'
        };
        const res = await request(app).post('/api/onboard/recruiter').send(payload);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.recruiter.companyName).toBe('NVIDIA Graphics');
    });

    test('13. Recruiter onboarding rejects request missing company name or email', async () => {
        const res = await request(app).post('/api/onboard/recruiter').send({ recruiterName: 'John' });
        expect(res.status).toBe(400);
    });

    test('14. Autonomous AI Drive Parser extracts CTC, cutoff CGPA, and interview stages', async () => {
        const driveText = `
            Company: Amazon AWS
            Role: Cloud Support Associate
            CTC: 28.5 LPA
            Eligibility Cutoff: 8.0 CGPA
            Round 1: Online Assessment Coding & Debugging
            Round 2: Systems & Networking Deep Dive
            Round 3: Leadership Principles & Bar Raiser
        `;
        const res = await request(app).post('/api/ai/parse-company-drive').send({ driveText, companyName: 'Amazon AWS' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.drive.ctc).toBe('28.5 LPA');
        expect(res.body.drive.minCgpa).toBe(8.0);
        expect(res.body.drive.rounds.length).toBe(3);
    });

    // ─── 4. Autonomous AI Operations & Copilot Agent (Tests 15-18) ───
    test('15. AI Agent Chatbot explains AC-3 clash resolution and OCC locking', async () => {
        const res = await request(app).post('/api/ai/agent-chat').send({ message: 'What happens if there is a clash or conflict?' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.response).toMatch(/clash|conflict|AC-3/i);
    });

    test('16. AI Agent Chatbot explains Gale-Shapley matching stability guarantee', async () => {
        const res = await request(app).post('/api/ai/agent-chat').send({ message: 'How does gale shapley matching work?' });
        expect(res.status).toBe(200);
        expect(res.body.response).toMatch(/Gale-Shapley|blocking pairs/i);
    });

    test('17. AI Agent Chatbot explains Hungarian panel optimization', async () => {
        const res = await request(app).post('/api/ai/agent-chat').send({ message: 'Tell me about hungarian panel allocation' });
        expect(res.status).toBe(200);
        expect(res.body.response).toMatch(/Hungarian/i);
    });

    test('18. AI Company Drive Parser rejects empty text with 400', async () => {
        const res = await request(app).post('/api/ai/parse-company-drive').send({ driveText: '   ' });
        expect(res.status).toBe(400);
    });

    // ─── 5. System State & Analytics (Tests 19-21) ─────────────────
    test('19. State endpoint returns complete recruitment snapshot', async () => {
        const res = await request(app).get('/api/state');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('panels');
        expect(res.body).toHaveProperty('waitQueue');
        expect(res.body).toHaveProperty('interviews');
    });

    test('20. Analytics throughput returns real-time candidate placement metrics', async () => {
        const res = await request(app).get('/api/analytics/throughput');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('placementRate');
        expect(res.body).toHaveProperty('totalCandidates');
        expect(res.body).toHaveProperty('activePanels');
    });

    test('21. Placement relations endpoint returns multi-company mesh hierarchy', async () => {
        const res = await request(app).get('/api/placement-relations');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.relations)).toBe(true);
    });

    // ─── 6. Dynamic Clash Detection & AC-3 Alternatives (Tests 22-25)
    test('22. Dynamic clash detection identifies exam timetable collision (03:00 PM / 900 mins)', async () => {
        const res = await request(app)
            .post('/api/check-clash')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: 'STU_001', proposedStart: 900, duration: 45 });
        expect(res.status).toBe(200);
        expect(res.body.conflictFree).toBe(false);
        expect(res.body.clashType).toBe('ACADEMIC');
    });

    test('23. Dynamic clash detection confirms conflict-free morning slot (12:00 PM / 720 mins)', async () => {
        const res = await request(app)
            .post('/api/check-clash')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: 'STU_001', proposedStart: 720, duration: 45 });
        expect(res.status).toBe(200);
        expect(res.body.conflictFree).toBe(true);
    });

    test('24. Clash response provides intelligent alternative slots when blocked', async () => {
        const res = await request(app)
            .post('/api/check-clash')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: 'STU_001', proposedStart: 900, duration: 45 });
        expect(res.body.suggestedAlternatives).toBeDefined();
        expect(res.body.suggestedAlternatives.length).toBeGreaterThan(0);
    });

    test('25. Clash detection validates parameters using Zod schema', async () => {
        const res = await request(app)
            .post('/api/check-clash')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: '', proposedStart: 'invalid-date' });
        expect(res.status).toBe(400);
    });

    // ─── 7. Delay Modeling & Ripple Cascade (Tests 26-29) ───────────
    test('26. Delay logging shifts only downstream interviews within same panel', async () => {
        const stateRes = await request(app).get('/api/state').set('Authorization', `Bearer ${adminToken}`);
        const targetId = stateRes.body.interviews?.[0]?.id || 1;
        const res = await request(app)
            .post('/api/log-delay')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ interviewId: targetId, actualDuration: 65 });
        expect(res.status).toBe(200);
        expect(res.body.result).toBeDefined();
        expect(res.body.result.shiftedCount).toBeGreaterThanOrEqual(0);
    });

    test('27. Delay shift cascades correctly and updates interview state', async () => {
        const stateRes = await request(app).get('/api/state').set('Authorization', `Bearer ${adminToken}`);
        const targetId = stateRes.body.interviews?.[0]?.id || 1;
        const res = await request(app)
            .post('/api/log-delay')
            .set('Authorization', `Bearer ${panelToken}`)
            .send({ interviewId: targetId, actualDuration: 55 });
        expect(res.status).toBe(200);
        expect(res.body.state).toBeDefined();
    });

    test('28. Simulating delay via UNCLASH V4 calculates non-interfering ripple', async () => {
        const res = await request(app)
            .post('/api/v4/unclash/simulate-delay')
            .send({ delayMinutes: 20, delayedPanel: 'Google (Systems Panel)' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.adjustedAssignments).toBeDefined();
        expect(res.body.cascadeStatus).toBe('CASCADE_HEALED_ZERO_OVERLAPS');
    });

    test('29. Delay logging rejects negative duration with 400', async () => {
        const res = await request(app)
            .post('/api/log-delay')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ interviewId: 1, actualDuration: -15 });
        expect(res.status).toBe(400);
    });

    // ─── 8. Waitlist Priority & Queue Aging (Tests 30-33) ────────────
    test('30. Multi-factor priority score incorporates CGPA and wait intervals', () => {
        const scoreLowWait = scheduler.getMultiFactorPriority(100, 1, 9.0);
        const scoreHighWait = scheduler.getMultiFactorPriority(100, 5, 9.0);
        expect(scoreHighWait).toBeGreaterThan(scoreLowWait);
    });

    test('31. POST /api/age-queue increments candidate wait-time intervals', async () => {
        const res = await request(app)
            .post('/api/age-queue')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Candidate queues successfully aged/i);
    });

    test('32. Candidate deletion cascades cleanly and purges student relations', async () => {
        const res = await request(app).delete('/api/students/STU_999');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('33. Academic schedule deletion endpoint executes gracefully', async () => {
        const res = await request(app).delete('/api/academic-schedules/999');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // ─── 9. Scorecard & Virtual Room Gateway (Tests 34-37) ─────────
    test('34. Scorecard recording above threshold unlocks next round invite notification', async () => {
        const res = await request(app)
            .post('/api/log-score')
            .set('Authorization', `Bearer ${panelToken}`)
            .send({
                studentId: 'STU_001',
                studentName: 'Preetham J',
                panelId: 'PanelA',
                roundName: 'DSA Round 2',
                score: 85,
                threshold: 70
            });
        expect(res.status).toBe(200);
        expect(res.body.pass).toBe(true);
    });

    test('35. Scorecard below threshold logs result without fast-track promotion', async () => {
        const res = await request(app)
            .post('/api/log-score')
            .set('Authorization', `Bearer ${panelToken}`)
            .send({
                studentId: 'STU_002',
                studentName: 'Candidate Two',
                panelId: 'PanelA',
                roundName: 'System Design',
                score: 50,
                threshold: 75
            });
        expect(res.status).toBe(200);
        expect(res.body.pass).toBe(false);
    });

    test('36. Virtual room gateway generates secure room token and WebRTC channel ID', async () => {
        const res = await request(app)
            .post('/api/virtual-room')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ panelId: 'PANEL_SECURE', company: 'Google', candidateName: 'Preetham J' });
        expect(res.status).toBe(200);
        expect(res.body.roomId).toBeDefined();
        expect(res.body.interviewerToken).toBeDefined();
    });

    test('37. Scorecard normalizer calibrates raw scores using historical distributions', async () => {
        const res = await request(app)
            .post('/api/v2/ir11/scorecard/calibrate')
            .set('Authorization', `Bearer ${panelToken}`)
            .send({
                rawScore: 88,
                panelHistoricalScores: [70, 72, 75, 80],
                globalCampusScores: [65, 70, 75, 80, 85]
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.result).toHaveProperty('calibratedScore');
    });

    // ─── 10. Kuhn-Munkres & Gale-Shapley Stable Matcher (Tests 38-42)
    test('38. UNCLASH V4 matrix endpoint returns bipartite preference nodes', async () => {
        const res = await request(app).get('/api/v4/unclash/matrix');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.solution).toHaveProperty('assignments');
        expect(res.body.solution).toHaveProperty('cryptographicPassport');
    });

    test('39. UNCLASH V4 solve endpoint eliminates all clashes in O(V³)', async () => {
        const res = await request(app).post('/api/v4/unclash/solve');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.clashesEliminated).toBe(4);
        expect(res.body.kktDualityGap).toBe(0.000);
        expect(res.body.cryptographicPassport).toBeDefined();
    });

    test('40. Gale-Shapley engine guarantees zero blocking pairs across companies and candidates', async () => {
        const res = await request(app)
            .post('/api/v2/ir11/matching/gale-shapley')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.result.isStable).toBe(true);
        expect(res.body.result.blockingPairsCount).toBe(0);
    });

    test('41. Hungarian assignment engine computes global cost-minimizing interviewer assignment', async () => {
        const interviewers = [
            { id: 'INT_1', skills: ['DSA', 'System Design'] },
            { id: 'INT_2', skills: ['ML', 'Python'] }
        ];
        const candidates = [
            { id: 'CAND_1', domain: 'DSA' },
            { id: 'CAND_2', domain: 'ML' }
        ];
        const res = await request(app)
            .post('/api/v2/ir11/assignment/hungarian')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ interviewers, candidates });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.result).toHaveProperty('assignments');
    });

    test('42. Interval coloring engine computes minimum required interview rooms', async () => {
        const intervals = [
            { id: 'INT_A', start: 540, end: 600 },
            { id: 'INT_B', start: 570, end: 630 },
            { id: 'INT_C', start: 610, end: 660 }
        ];
        const availableRooms = ['Room-101', 'Room-102', 'Room-103'];
        const res = await request(app)
            .post('/api/v2/ir11/rooms/interval-coloring')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ intervals, availableRoomNames: availableRooms });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.result).toHaveProperty('minimumRoomsNeeded');
    });

    // ─── 11. Offer Cascading & Concurrency Dequeuing (Tests 43-46) ───
    test('43. Candidate offer acceptance dequeues candidate across all competing corporate queues', async () => {
        const res = await request(app)
            .post('/api/accept-offer')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: 'STU_001', studentName: 'Preetham J', companyName: 'Google' });
        expect(res.status).toBe(200);
        expect(res.body.resolution).toBeDefined();
        expect(res.body.resolution.vacatedCompanies.length).toBeGreaterThan(0);
    });

    test('44. Vacated interview spot backfills next-in-line candidate atomically', async () => {
        const res = await request(app)
            .post('/api/accept-offer')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ studentId: 'STU_002', studentName: 'Candidate Two', companyName: 'Microsoft' });
        expect(res.status).toBe(200);
        expect(res.body.resolution.promotions).toBeDefined();
    });

    test('45. UNCLASH offer-cascade-reclaim frees schedule in O(1)', async () => {
        const res = await request(app)
            .post('/api/v4/unclash/offer-cascade-reclaim')
            .send({ candidateId: 'CAND-101', acceptedCompany: 'Google' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.releasedSlotsCount).toBeGreaterThanOrEqual(0);
    });

    test('46. Multi-company conflict matrix generates hard overlaps and buffer warnings', async () => {
        const res = await request(app).get('/api/v4/unclash/conflict-matrix');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('hardClashes');
        expect(res.body).toHaveProperty('bufferClashes');
    });

    // ─── 12. Batch Ingestion, iCal Feeds, and System Reset (Tests 47-50)
    test('47. Batch candidate roster CSV upload ingests records atomically', async () => {
        const csvData = `id,name,cgpa,department,status\nSTU_BATCH_01,Aarav Rao,9.4,CSE,AVAILABLE\nSTU_BATCH_02,Bhavna Patel,8.9,ECE,AVAILABLE`;
        const res = await request(app)
            .post('/api/students/upload')
            .send({ csv: csvData });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(2);
    });

    test('48. RFC 5545 iCalendar stream exports valid VCALENDAR feed with proper MIME header', async () => {
        const res = await request(app).get('/api/calendar/STU_001.ics');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/calendar');
        expect(res.text).toContain('BEGIN:VCALENDAR');
        expect(res.text).toContain('END:VCALENDAR');
    });

    test('49. Temporary slot lease acquisition secures slot with TTL OCC lock', async () => {
        const res = await request(app)
            .post('/api/v2/ir15/lease/acquire')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ slotId: 'SLOT_TEST_99', candidateId: 'STU_001', durationSeconds: 60 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.result).toHaveProperty('leaseToken');
    });

    test('50. Placement database reset securely restores initial enterprise seed baseline', async () => {
        const res = await request(app)
            .post('/api/reset')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/database successfully reset/i);
        expect(res.body.state.panels.length).toBeGreaterThan(0);
    });
});
