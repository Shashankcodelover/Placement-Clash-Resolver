const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'placement_hub.sqlite');

class PlacementDatabase {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run('PRAGMA journal_mode = TRUNCATE;');
            this.db.run('PRAGMA busy_timeout = 5000;');

            // 0. Users
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    name TEXT NOT NULL
                );
            `);

            // 1. Students table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS students (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    cgpa REAL NOT NULL,
                    department TEXT NOT NULL,
                    status TEXT DEFAULT 'ACTIVE',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // 2. Academic Schedules
            this.db.run(`
                CREATE TABLE IF NOT EXISTS academic_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    event_name TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL
                );
            `);

            // 3. Interview Panels
            this.db.run(`
                CREATE TABLE IF NOT EXISTS panels (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    company TEXT NOT NULL,
                    interviewer_name TEXT NOT NULL,
                    virtual_room_url TEXT,
                    status TEXT DEFAULT 'IDLE',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // 4. Interviews
            this.db.run(`
                CREATE TABLE IF NOT EXISTS interviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    panel_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    round_name TEXT NOT NULL,
                    scheduled_start TEXT NOT NULL,
                    scheduled_end TEXT NOT NULL,
                    estimated_start TEXT NOT NULL,
                    estimated_end TEXT NOT NULL,
                    actual_duration INTEGER,
                    status TEXT DEFAULT 'Pending',
                    delay_mins INTEGER DEFAULT 0
                );
            `);

            // 5. Corporate Queues
            this.db.run(`
                CREATE TABLE IF NOT EXISTS corporate_queues (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    company TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    base_score INTEGER NOT NULL,
                    wait_intervals INTEGER DEFAULT 0,
                    priority_score REAL NOT NULL,
                    queue_status TEXT DEFAULT 'WAITING'
                );
            `);

            // 6. Scorecards
            this.db.run(`
                CREATE TABLE IF NOT EXISTS scorecards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    panel_id TEXT NOT NULL,
                    round_name TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    threshold INTEGER NOT NULL,
                    pass INTEGER NOT NULL,
                    feedback TEXT,
                    timestamp TEXT NOT NULL
                );
            `);

            // 7. Notifications
            this.db.run(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    channel TEXT DEFAULT 'IN_APP',
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    read INTEGER DEFAULT 0
                );
            `);

            // 8. Audit Logs
            this.db.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp TEXT NOT NULL
                );
            `);

            // 9. Placement Relations & Allocation Mesh
            this.db.run(`
                CREATE TABLE IF NOT EXISTS placement_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    company TEXT NOT NULL,
                    panel_id TEXT NOT NULL,
                    track_name TEXT NOT NULL,
                    venue_room TEXT NOT NULL,
                    capacity INTEGER DEFAULT 1,
                    interviewer_lead TEXT NOT NULL,
                    status TEXT DEFAULT 'ACTIVE',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            this.seedData();
        });
    }

    getISOOffsetMins(minutes) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const d = new Date(today);
        d.setUTCMinutes(d.getUTCMinutes() + minutes);
        return d.toISOString();
    }

    seedData() {
        this.db.get('SELECT COUNT(*) as count FROM students;', async (err, row) => {
            if (!err && row && row.count > 0) return;

            console.log('[DB] Seeding enterprise dataset...');
            const defaultTenant = 'T_001';
            const adminHash = await bcrypt.hash('admin123', 10);
            
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION;');

                const insertUser = this.db.prepare('INSERT OR REPLACE INTO users (id, tenant_id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?, ?);');
                insertUser.run(1, defaultTenant, 'admin', adminHash, 'ADMIN', 'Placement Director');
                insertUser.finalize();

                // Students
                const insertStudent = this.db.prepare('INSERT OR REPLACE INTO students (id, tenant_id, name, email, cgpa, department) VALUES (?, ?, ?, ?, ?, ?);');
                insertStudent.run('STU_001', defaultTenant, 'Preetham J', 'preetham@uni.edu', 9.2, 'Computer Science');
                insertStudent.run('STU_002', defaultTenant, 'Aditya Roy', 'aditya@uni.edu', 8.8, 'Information Science');
                insertStudent.run('STU_003', defaultTenant, 'John Doe', 'john@uni.edu', 8.5, 'Electronics & Comm');
                insertStudent.run('STU_004', defaultTenant, 'Sneha Sharma', 'sneha@uni.edu', 9.5, 'Computer Science');
                insertStudent.run('STU_005', defaultTenant, 'Vikram Seth', 'vikram@uni.edu', 8.1, 'Mechanical Engg');
                insertStudent.finalize();

                // Academic Schedules
                const insertSchedule = this.db.prepare('INSERT INTO academic_schedules (tenant_id, student_id, event_name, start_time, end_time) VALUES (?, ?, ?, ?, ?);');
                insertSchedule.run(defaultTenant, 'STU_001', 'Computer Networks Lab', this.getISOOffsetMins(900), this.getISOOffsetMins(1100));
                insertSchedule.run(defaultTenant, 'STU_001', 'Midterm Exam: OS', this.getISOOffsetMins(1400), this.getISOOffsetMins(1530));
                insertSchedule.run(defaultTenant, 'STU_002', 'DBMS Lecture', this.getISOOffsetMins(600), this.getISOOffsetMins(690));
                insertSchedule.run(defaultTenant, 'STU_002', 'Compiler Design Lab', this.getISOOffsetMins(900), this.getISOOffsetMins(1020));
                insertSchedule.run(defaultTenant, 'STU_003', 'VLSI Seminar', this.getISOOffsetMins(660), this.getISOOffsetMins(720));
                insertSchedule.run(defaultTenant, 'STU_004', 'Cloud Computing Viva', this.getISOOffsetMins(840), this.getISOOffsetMins(960));
                insertSchedule.finalize();

                // Panels
                const insertPanel = this.db.prepare('INSERT OR REPLACE INTO panels (id, tenant_id, name, company, interviewer_name, virtual_room_url, status) VALUES (?, ?, ?, ?, ?, ?, ?);');
                insertPanel.run('PanelA', defaultTenant, 'Google Panel #1', 'Google', 'Sundar R. (Staff Engineer)', 'https://meet.google.com/uni-place-01', 'IN_INTERVIEW');
                insertPanel.run('PanelB', defaultTenant, 'Microsoft Panel #1', 'Microsoft', 'Satya N. (Principal Lead)', 'https://teams.microsoft.com/l/meetup/uni-place-02', 'IDLE');
                insertPanel.run('PanelC', defaultTenant, 'Meta Panel #1', 'Meta', 'Mark Z. (Engineering Director)', 'https://meet.google.com/uni-place-03', 'IDLE');
                insertPanel.run('PanelD', defaultTenant, 'Goldman Sachs Panel #1', 'Goldman Sachs', 'David S. (VP Tech)', 'https://meet.google.com/uni-place-04', 'IDLE');
                insertPanel.finalize();

                // Interviews
                const insertInterview = this.db.prepare('INSERT INTO interviews (tenant_id, panel_id, student_id, round_name, scheduled_start, scheduled_end, estimated_start, estimated_end, status, delay_mins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);');
                insertInterview.run(defaultTenant, 'PanelA', 'STU_001', 'Technical Round 1 (DSA)', this.getISOOffsetMins(600), this.getISOOffsetMins(645), this.getISOOffsetMins(600), this.getISOOffsetMins(645), 'In Progress', 0);
                insertInterview.run(defaultTenant, 'PanelA', 'STU_002', 'Technical Round 1 (DSA)', this.getISOOffsetMins(650), this.getISOOffsetMins(710), this.getISOOffsetMins(650), this.getISOOffsetMins(710), 'Pending', 0);
                insertInterview.run(defaultTenant, 'PanelB', 'STU_003', 'Systems Architecture', this.getISOOffsetMins(660), this.getISOOffsetMins(720), this.getISOOffsetMins(660), this.getISOOffsetMins(720), 'Pending', 0);
                insertInterview.run(defaultTenant, 'PanelC', 'STU_004', 'Full Stack Deep Dive', this.getISOOffsetMins(600), this.getISOOffsetMins(660), this.getISOOffsetMins(600), this.getISOOffsetMins(660), 'Pending', 0);
                insertInterview.finalize();

                // Corporate Queues
                const insertQueue = this.db.prepare('INSERT INTO corporate_queues (tenant_id, company, student_id, base_score, wait_intervals, priority_score, queue_status) VALUES (?, ?, ?, ?, ?, ?, ?);');
                insertQueue.run(defaultTenant, 'Google', 'STU_001', 85, 0, 85, 'ACTIVE');
                insertQueue.run(defaultTenant, 'Google', 'STU_003', 75, 1, 85, 'WAITING');
                insertQueue.run(defaultTenant, 'Google', 'STU_004', 90, 0, 90, 'WAITING');
                insertQueue.run(defaultTenant, 'Microsoft', 'STU_002', 80, 0, 80, 'ACTIVE');
                insertQueue.run(defaultTenant, 'Microsoft', 'STU_001', 85, 0, 85, 'WAITING');
                insertQueue.run(defaultTenant, 'Microsoft', 'STU_005', 70, 2, 85, 'WAITING');
                insertQueue.run(defaultTenant, 'Meta', 'STU_004', 92, 0, 92, 'ACTIVE');
                insertQueue.run(defaultTenant, 'Meta', 'STU_001', 85, 0, 85, 'WAITING');
                insertQueue.run(defaultTenant, 'Meta', 'STU_002', 80, 0, 80, 'WAITING');
                insertQueue.finalize();

                // Placement Relations & Allocation Mesh
                const insertRel = this.db.prepare('INSERT INTO placement_relations (tenant_id, company, panel_id, track_name, venue_room, capacity, interviewer_lead, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
                insertRel.run(defaultTenant, 'Google', 'PanelA', 'Distributed Systems & Cloud Core', 'Boardroom Alpha (Wing A)', 2, 'Sundar R. (Staff Engineer)', 'ACTIVE');
                insertRel.run(defaultTenant, 'Microsoft', 'PanelB', 'Systems Architecture & Windows Kernel', 'Lab 402 (Engineering Wing)', 2, 'Satya N. (Principal Lead)', 'ACTIVE');
                insertRel.run(defaultTenant, 'Meta', 'PanelC', 'Fullstack Architecture & AI Infrastructure', 'Virtual Suite 1 (WebRTC)', 3, 'Mark Z. (Engineering Director)', 'ACTIVE');
                insertRel.run(defaultTenant, 'Goldman Sachs', 'PanelD', 'Low-Latency C++ & Quant Analytics', 'Conference Hall (Finance Wing)', 1, 'David S. (VP Tech)', 'ACTIVE');
                insertRel.finalize();

                this.db.run('COMMIT;', (commitErr) => {
                    if (!commitErr) console.log('[DB] Seeding completed atomically.');
                });
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    async getSystemSnapshot(tenantId = 'T_001') {
        const students = await this.all('SELECT * FROM students WHERE tenant_id = ? ORDER BY id;', [tenantId]);
        const schedules = await this.all('SELECT * FROM academic_schedules WHERE tenant_id = ? ORDER BY start_time;', [tenantId]);
        const panels = await this.all('SELECT * FROM panels WHERE tenant_id = ? ORDER BY id;', [tenantId]);
        const interviews = await this.all(`
            SELECT i.*, s.name as studentName, s.department, p.company as companyName
            FROM interviews i
            JOIN students s ON i.student_id = s.id
            JOIN panels p ON i.panel_id = p.id
            WHERE i.tenant_id = ?
            ORDER BY i.estimated_start;
        `, [tenantId]);
        const queues = await this.all(`
            SELECT q.*, s.name as studentName, s.cgpa
            FROM corporate_queues q
            JOIN students s ON q.student_id = s.id
            WHERE q.tenant_id = ?
            ORDER BY q.company, q.priority_score DESC;
        `, [tenantId]);
        const scorecards = await this.all('SELECT * FROM scorecards WHERE tenant_id = ? ORDER BY id DESC LIMIT 50;', [tenantId]);
        const notifications = await this.all('SELECT * FROM notifications WHERE tenant_id = ? ORDER BY id DESC LIMIT 50;', [tenantId]);
        const auditLogs = await this.all('SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY id DESC LIMIT 50;', [tenantId]);
        const placementRelations = await this.all('SELECT * FROM placement_relations WHERE tenant_id = ? ORDER BY id;', [tenantId]);

        // Build academic timetable lookup
        const academicTimetable = {};
        students.forEach(s => { academicTimetable[s.id] = []; });
        schedules.forEach(sc => {
            if (!academicTimetable[sc.student_id]) academicTimetable[sc.student_id] = [];
            academicTimetable[sc.student_id].push({
                name: sc.event_name,
                start: sc.start_time,
                end: sc.end_time
            });
        });

        // Initialize standard companies
        const corporateQueues = {
            'Google': [],
            'Microsoft': [],
            'Meta': [],
            'Goldman Sachs': []
        };
        queues.forEach(q => {
            if (!corporateQueues[q.company]) corporateQueues[q.company] = [];
            corporateQueues[q.company].push({
                studentId: q.student_id,
                studentName: q.studentName,
                baseScore: q.base_score,
                waitIntervals: q.wait_intervals,
                priorityScore: q.priority_score,
                status: q.queue_status
            });
        });

        const waitQueue = queues.map(q => ({
            studentId: q.student_id,
            studentName: `${q.studentName} (${q.student_id})`,
            company: q.company,
            waitIntervals: q.wait_intervals,
            baseScore: q.base_score,
            priorityScore: q.priority_score
        }));

        return {
            students,
            academicTimetable,
            panels,
            interviews,
            waitQueue,
            corporateQueues,
            placementRelations,
            triggerLogs: scorecards.map(sc => ({
                studentId: sc.student_id,
                studentName: sc.student_id,
                roundName: sc.round_name,
                score: sc.score,
                pass: sc.pass === 1,
                alertSent: true,
                timestamp: sc.timestamp
            })),
            pushNotifications: notifications.map(n => ({
                studentId: n.student_id,
                studentName: n.student_id,
                message: n.message,
                time: n.timestamp
            })),
            auditLogs
        };
    }

    // --- Universal Deletion Methods ---
    async deleteStudent(tenantId, studentId) {
        await this.run('BEGIN TRANSACTION;');
        try {
            await this.run('DELETE FROM corporate_queues WHERE tenant_id = ? AND student_id = ?;', [tenantId, studentId]);
            await this.run('DELETE FROM academic_schedules WHERE tenant_id = ? AND student_id = ?;', [tenantId, studentId]);
            await this.run('DELETE FROM interviews WHERE tenant_id = ? AND student_id = ?;', [tenantId, studentId]);
            await this.run('DELETE FROM scorecards WHERE tenant_id = ? AND student_id = ?;', [tenantId, studentId]);
            await this.run('DELETE FROM notifications WHERE tenant_id = ? AND student_id = ?;', [tenantId, studentId]);
            const res = await this.run('DELETE FROM students WHERE tenant_id = ? AND id = ?;', [tenantId, studentId]);
            await this.run(`INSERT INTO audit_logs (tenant_id, actor, action, details, timestamp) VALUES (?, ?, ?, ?, ?);`,
                [tenantId, 'ADMIN', 'DELETE_STUDENT', `Cascading purge of candidate ${studentId}`, new Date().toISOString()]);
            await this.run('COMMIT;');
            return res;
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async deletePanel(tenantId, panelId) {
        await this.run('BEGIN TRANSACTION;');
        try {
            await this.run('DELETE FROM interviews WHERE tenant_id = ? AND panel_id = ?;', [tenantId, panelId]);
            await this.run('DELETE FROM placement_relations WHERE tenant_id = ? AND panel_id = ?;', [tenantId, panelId]);
            const res = await this.run('DELETE FROM panels WHERE tenant_id = ? AND id = ?;', [tenantId, panelId]);
            await this.run(`INSERT INTO audit_logs (tenant_id, actor, action, details, timestamp) VALUES (?, ?, ?, ?, ?);`,
                [tenantId, 'ADMIN', 'DELETE_PANEL', `Dissolved panel ${panelId}`, new Date().toISOString()]);
            await this.run('COMMIT;');
            return res;
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async deleteInterview(tenantId, interviewId) {
        return await this.run('DELETE FROM interviews WHERE tenant_id = ? AND id = ?;', [tenantId, interviewId]);
    }

    async deleteQueue(tenantId, queueId) {
        return await this.run('DELETE FROM corporate_queues WHERE tenant_id = ? AND id = ?;', [tenantId, queueId]);
    }

    async deleteAcademicSchedule(tenantId, scheduleId) {
        return await this.run('DELETE FROM academic_schedules WHERE tenant_id = ? AND id = ?;', [tenantId, scheduleId]);
    }

    async deletePlacementRelation(tenantId, relationId) {
        return await this.run('DELETE FROM placement_relations WHERE tenant_id = ? AND id = ?;', [tenantId, relationId]);
    }

    // --- Placement Relations & Allocation Mesh Methods ---
    async getPlacementRelations(tenantId) {
        return await this.all('SELECT * FROM placement_relations WHERE tenant_id = ? ORDER BY id;', [tenantId]);
    }

    async insertPlacementRelation(tenantId, data) {
        const { company, panelId, trackName, venueRoom, capacity = 1, interviewerLead, status = 'ACTIVE' } = data;
        const res = await this.run(
            `INSERT INTO placement_relations (tenant_id, company, panel_id, track_name, venue_room, capacity, interviewer_lead, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [tenantId, company, panelId, trackName, venueRoom, capacity, interviewerLead, status]
        );
        return { id: res.lastID, ...data };
    }

    // --- Enterprise Bulk Ingestion Methods ---
    async bulkUpsertStudents(tenantId, students) {
        let inserted = 0;
        await this.run('BEGIN TRANSACTION;');
        try {
            for (const s of students) {
                const id = s.id || s.usn || `STU_${Math.floor(100 + Math.random() * 900)}`;
                const name = s.name || 'Unnamed Candidate';
                const email = s.email || `${id.toLowerCase()}@uni.edu`;
                const cgpa = parseFloat(s.cgpa) || 8.0;
                const department = s.department || s.dept || 'Computer Science';
                const status = s.status || 'ACTIVE';

                await this.run(
                    `INSERT OR REPLACE INTO students (id, tenant_id, name, email, cgpa, department, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [id, tenantId, name, email, cgpa, department, status]
                );
                inserted++;
            }
            await this.run('COMMIT;');
            return { count: inserted };
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async bulkInsertPanels(tenantId, panels) {
        let inserted = 0;
        await this.run('BEGIN TRANSACTION;');
        try {
            for (const p of panels) {
                const id = p.id || `Panel_${Math.floor(100 + Math.random() * 900)}`;
                const name = p.name || `${p.company || 'Enterprise'} Panel`;
                const company = p.company || 'Enterprise Corp';
                const interviewerName = p.interviewer_name || p.interviewerName || 'Lead Engineer';
                const virtualRoomUrl = p.virtual_room_url || p.virtualRoomUrl || 'https://meet.google.com/uni-place';
                const status = p.status || 'IDLE';

                await this.run(
                    `INSERT OR REPLACE INTO panels (id, tenant_id, name, company, interviewer_name, virtual_room_url, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [id, tenantId, name, company, interviewerName, virtualRoomUrl, status]
                );
                inserted++;
            }
            await this.run('COMMIT;');
            return { count: inserted };
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async bulkInsertInterviews(tenantId, interviews) {
        let inserted = 0;
        await this.run('BEGIN TRANSACTION;');
        try {
            for (const i of interviews) {
                const panelId = i.panel_id || i.panelId || 'PanelA';
                const studentId = i.student_id || i.studentId || 'STU_001';
                const roundName = i.round_name || i.roundName || 'Technical Round';
                const schedStart = i.scheduled_start || i.scheduledStart || this.getISOOffsetMins(600);
                const schedEnd = i.scheduled_end || i.scheduledEnd || this.getISOOffsetMins(645);
                const estStart = i.estimated_start || i.estimatedStart || schedStart;
                const estEnd = i.estimated_end || i.estimatedEnd || schedEnd;
                const status = i.status || 'Pending';
                const delayMins = parseInt(i.delay_mins || i.delayMins || 0);

                await this.run(
                    `INSERT INTO interviews (tenant_id, panel_id, student_id, round_name, scheduled_start, scheduled_end, estimated_start, estimated_end, status, delay_mins)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [tenantId, panelId, studentId, roundName, schedStart, schedEnd, estStart, estEnd, status, delayMins]
                );
                inserted++;
            }
            await this.run('COMMIT;');
            return { count: inserted };
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async bulkInsertAcademicSchedules(tenantId, schedules) {
        let inserted = 0;
        await this.run('BEGIN TRANSACTION;');
        try {
            for (const s of schedules) {
                const studentId = s.student_id || s.studentId || 'STU_001';
                const eventName = s.event_name || s.eventName || 'Midterm Exam';
                const startTime = s.start_time || s.startTime || this.getISOOffsetMins(900);
                const endTime = s.end_time || s.endTime || this.getISOOffsetMins(1100);

                await this.run(
                    `INSERT INTO academic_schedules (tenant_id, student_id, event_name, start_time, end_time)
                     VALUES (?, ?, ?, ?, ?);`,
                    [tenantId, studentId, eventName, startTime, endTime]
                );
                inserted++;
            }
            await this.run('COMMIT;');
            return { count: inserted };
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }

    async bulkInsertPlacementRelations(tenantId, relations) {
        let inserted = 0;
        await this.run('BEGIN TRANSACTION;');
        try {
            for (const r of relations) {
                const company = r.company || 'Google';
                const panelId = r.panel_id || r.panelId || 'PanelA';
                const trackName = r.track_name || r.trackName || 'General Engineering Track';
                const venueRoom = r.venue_room || r.venueRoom || 'Virtual Suite';
                const capacity = parseInt(r.capacity) || 1;
                const interviewerLead = r.interviewer_lead || r.interviewerLead || 'Lead Interviewer';
                const status = r.status || 'ACTIVE';

                await this.run(
                    `INSERT INTO placement_relations (tenant_id, company, panel_id, track_name, venue_room, capacity, interviewer_lead, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                    [tenantId, company, panelId, trackName, venueRoom, capacity, interviewerLead, status]
                );
                inserted++;
            }
            await this.run('COMMIT;');
            return { count: inserted };
        } catch (e) {
            await this.run('ROLLBACK;');
            throw e;
        }
    }
}

const dbInstance = new PlacementDatabase();
module.exports = dbInstance;
