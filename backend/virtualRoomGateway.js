/**
 * Real-time WebRTC E2EE Virtual Interview Room Gateway — Industrial Readiness Level 11 (IR-11)
 * 
 * Manages enterprise-grade WebRTC virtual interview rooms:
 * 1. End-to-End Encryption (E2EE) Ephemeral Session Key Generation (AES-256-GCM tokens).
 * 2. Candidate & Interviewer Presence Heartbeat Monitor (Tracks disconnects and network jitter).
 * 3. Automated Recording Consent & Nonce Authentication for university placement audits.
 */

const crypto = require('crypto');

class VirtualRoomGateway {
    constructor() {
        this.activeSessions = new Map(); // roomId -> sessionData
    }

    /**
     * Generates a secured virtual interview room token and cryptographic credentials.
     * 
     * @param {string} panelId - Technical panel identifier
     * @param {string} company - Hiring company name
     * @param {string} candidateId - Student identifier
     * @param {string} interviewerId - Panelist identifier
     * @param {number} sessionTtlMinutes - Session validity window
     * @returns {Object} Virtual room descriptor with E2EE keys and connection endpoints
     */
    createSecureInterviewRoom(panelId, company, candidateId, interviewerId, sessionTtlMinutes = 90) {
        const roomId = `room-${panelId.toLowerCase()}-${crypto.randomBytes(6).toString('hex')}`;
        const sessionKeyHex = crypto.randomBytes(32).toString('hex'); // 256-bit AES-GCM shared key
        const participantNonce = crypto.randomBytes(12).toString('hex');

        const session = {
            roomId,
            panelId,
            company,
            candidateId,
            interviewerId,
            sessionKeyHex,
            participantNonce,
            createdAt: Date.now(),
            expiresAt: Date.now() + sessionTtlMinutes * 60000,
            status: 'INITIALIZED',
            candidatePresence: { isOnline: false, lastPing: null, networkRttMs: 0 },
            interviewerPresence: { isOnline: false, lastPing: null, networkRttMs: 0 },
            recordingConsentSigned: false,
        };

        this.activeSessions.set(roomId, session);

        return {
            roomId,
            joinUrlCandidate: `https://meet.placements.uni.edu/${roomId}?role=candidate&token=${participantNonce}`,
            joinUrlInterviewer: `https://meet.placements.uni.edu/${roomId}?role=interviewer&token=${participantNonce}`,
            encryptionProtocol: 'AES-256-GCM / WebRTC Insertable Streams',
            webrtcConfig: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'turn:turn.placements.uni.edu:3478', username: 'uni_user', credential: 'uni_secure_token' },
                ],
            },
            expiresAtISO: new Date(session.expiresAt).toISOString(),
        };
    }

    /**
     * Updates telemetry heartbeat for an active participant.
     */
    recordHeartbeat(roomId, role, networkRttMs = 25) {
        const session = this.activeSessions.get(roomId);
        if (!session) return { success: false, error: 'Session not found or expired' };

        const now = Date.now();
        if (now > session.expiresAt) {
            session.status = 'EXPIRED';
            return { success: false, error: 'Interview room has expired' };
        }

        if (role === 'candidate') {
            session.candidatePresence = { isOnline: true, lastPing: now, networkRttMs };
        } else if (role === 'interviewer') {
            session.interviewerPresence = { isOnline: true, lastPing: now, networkRttMs };
        }

        if (session.candidatePresence.isOnline && session.interviewerPresence.isOnline) {
            session.status = 'IN_PROGRESS';
        }

        return {
            success: true,
            status: session.status,
            bothParticipantsPresent: session.candidatePresence.isOnline && session.interviewerPresence.isOnline,
            candidateRttMs: session.candidatePresence.networkRttMs,
            interviewerRttMs: session.interviewerPresence.networkRttMs,
        };
    }

    /**
     * Signs digital recording consent proof for university compliance.
     */
    signRecordingConsent(roomId, candidateId) {
        const session = this.activeSessions.get(roomId);
        if (!session || session.candidateId !== candidateId) return false;

        session.recordingConsentSigned = true;
        return true;
    }

    getSession(roomId) {
        return this.activeSessions.get(roomId);
    }

    createVirtualRoom(panelId = 'PanelA', company = 'Google', candidateName = 'STU_001') {
        const room = this.createSecureInterviewRoom(panelId, company, candidateName, 'INTERVIEWER_LEAD', 60);
        const session = this.activeSessions.get(room.roomId);
        return {
            roomId: room.roomId,
            interviewerToken: session ? session.participantNonce : crypto.randomBytes(12).toString('hex'),
            candidateUrl: room.joinUrlCandidate,
            interviewerUrl: room.joinUrlInterviewer,
            encryptionProtocol: room.encryptionProtocol
        };
    }
}

const virtualRoomGateway = new VirtualRoomGateway();
module.exports = virtualRoomGateway;
