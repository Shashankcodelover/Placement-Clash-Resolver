const request = require('supertest');
const { app } = require('./server');
const arbitrator = require('./multiCompanyClashArbitrator');

describe('UNCLASH V4.2 Multi-Company Clash Arbitrator & Peer Slot Swap Engine', () => {

  describe('1. Cross-Drive Conflict Matrix Engine', () => {
    it('should accurately detect hard temporal overlaps across concurrent companies', () => {
      const result = arbitrator.generateConflictMatrix();
      expect(result.success).toBe(true);
      expect(result.totalConflicts).toBeGreaterThan(0);
      expect(result.hardClashes).toBeGreaterThanOrEqual(1);

      // Verify Aarav Sharma's hard overlap between Google & Microsoft
      const aaravClash = result.conflicts.find(c => c.candidateId === 'CAND-101' && c.type === 'HARD_OVERLAP');
      expect(aaravClash).toBeDefined();
      expect(aaravClash.severity).toBe('CRITICAL');
      expect(aaravClash.overlapDurationMins).toBe(30);
    });

    it('should detect soft transit buffer violations between distant physical rooms', () => {
      const result = arbitrator.generateConflictMatrix();
      expect(result.bufferClashes).toBeGreaterThanOrEqual(1);

      // Verify Vikram Patel's zero-minute transit buffer between Goldman Sachs & Amazon
      const vikramBuffer = result.conflicts.find(c => c.candidateId === 'CAND-103' && c.type === 'BUFFER_VIOLATION');
      expect(vikramBuffer).toBeDefined();
      expect(vikramBuffer.severity).toBe('WARNING');
      expect(vikramBuffer.transitGapMins).toBe(0);
    });

    it('should generate a deterministic cryptographic matrix hash', () => {
      const res1 = arbitrator.generateConflictMatrix();
      const res2 = arbitrator.generateConflictMatrix();
      expect(res1.clashMatrixHash).toMatch(/^0xMATRIX-[A-F0-9]{16}$/);
      expect(res1.clashMatrixHash).toBe(res2.clashMatrixHash);
    });
  });

  describe('2. Pareto-Optimal Peer Slot Swap Solver', () => {
    it('should resolve 100% of hard overlaps and buffer conflicts with zero residual clashes', () => {
      const result = arbitrator.solveParetoPeerSwaps();
      expect(result.success).toBe(true);
      expect(result.residualConflicts).toBe(0);
      expect(result.clashesEliminated).toBe(result.initialConflicts);
      expect(result.kktDualityGap).toBe(0.000);
      expect(result.paretoEfficiencyScore).toContain('100.0%');
    });

    it('should execute bilateral and triangular reciprocal swaps preserving recruiter time blocks', () => {
      const result = arbitrator.solveParetoPeerSwaps();
      expect(result.swapTransactions.length).toBeGreaterThanOrEqual(2);

      const bilateralSwap = result.swapTransactions.find(s => s.type === '2_WAY_PEER_SWAP');
      expect(bilateralSwap).toBeDefined();
      expect(bilateralSwap.candidateA.id).toBe('CAND-101');
      expect(bilateralSwap.candidateB.id).toBe('CAND-102');

      const triangularSwap = result.swapTransactions.find(s => s.type === '3_WAY_CIRCULAR_BUFFER_SWAP');
      expect(triangularSwap).toBeDefined();
      expect(triangularSwap.candidateA.id).toBe('CAND-103');
    });

    it('should issue a cryptographic escrow passport', () => {
      const result = arbitrator.solveParetoPeerSwaps();
      expect(result.cryptographicEscrowPassport).toMatch(/^0xSWAP-ESCROW-UNCLASH-[A-F0-9]{24}$/);
    });
  });

  describe('3. Autonomous Offer Cascade & Slot Release Ledger', () => {
    it('should release unaccepted slots and promote waitlist candidate upon offer acceptance', () => {
      const result = arbitrator.executeOfferCascadeRelease('CAND-101', 'Google');
      expect(result.success).toBe(true);
      expect(result.candidateId).toBe('CAND-101');
      expect(result.acceptedCompany).toBe('Google');
      expect(result.releasedSlotsCount).toBe(1);
      expect(result.waitlistAllocations.length).toBe(1);
      expect(result.waitlistAllocations[0].promotedCandidate.id).toBe('WAIT-201');
      expect(result.waitlistAllocations[0].promotedCandidate.name).toBe('Karthik Subramanian');
      expect(result.ledgerPassport).toMatch(/^0xCASCADE-RELEASE-[A-F0-9]{24}$/);
    });
  });

  describe('4. REST API Integration Endpoints', () => {
    it('GET /api/v4/unclash/conflict-matrix returns 200 and matrix', async () => {
      const res = await request(app).get('/api/v4/unclash/conflict-matrix');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conflicts).toBeInstanceOf(Array);
    });

    it('POST /api/v4/unclash/resolve-swaps executes slot swap solver', async () => {
      const res = await request(app).post('/api/v4/unclash/resolve-swaps').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.clashesEliminated).toBeGreaterThan(0);
      expect(res.body.kktDualityGap).toBe(0.000);
    });

    it('POST /api/v4/unclash/offer-cascade-reclaim successfully reclaims slots', async () => {
      const res = await request(app)
        .post('/api/v4/unclash/offer-cascade-reclaim')
        .send({ candidateId: 'CAND-101', acceptedCompany: 'Google' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.waitlistAllocations.length).toBeGreaterThan(0);
    });
  });
});
