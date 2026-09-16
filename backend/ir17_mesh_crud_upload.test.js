const request = require('supertest');
const { app } = require('./server');

describe('IR-17: Universal Deletion, Placement Relations Mesh & Bulk Uploadation Engine', () => {
    let adminToken = '';

    beforeAll(async () => {
        const loginRes = await request(app).post('/api/test-login').send({});
        adminToken = loginRes.body.token;
    });

    describe('1. Placement Relations & Allocation Mesh API', () => {
        let createdRelationId = null;

        it('GET /api/placement-relations should list existing topology relations', async () => {
            const res = await request(app).get('/api/placement-relations');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.relations)).toBe(true);
            expect(res.body.relations.length).toBeGreaterThan(0);
        });

        it('POST /api/placement-relations should register a new track corridor', async () => {
            const res = await request(app)
                .post('/api/placement-relations')
                .send({
                    company: 'Apple',
                    panelId: 'PanelA',
                    trackName: 'Silicon Architecture & Swift Core',
                    venueRoom: 'Auditorium 1',
                    capacity: 2,
                    interviewerLead: 'Craig F. (VP Software)',
                    status: 'ACTIVE'
                });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.relation.company).toBe('Apple');
            createdRelationId = res.body.relation.id;
        });

        it('DELETE /api/placement-relations/:id should sever a specific corridor', async () => {
            expect(createdRelationId).toBeDefined();
            const res = await request(app).delete(`/api/placement-relations/${createdRelationId}`);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/severed/i);
        });
    });

    describe('2. Enterprise Bulk Ingestion (Uploadation) Engine', () => {
        it('POST /api/students/upload should ingest JSON array of candidates', async () => {
            const res = await request(app)
                .post('/api/students/upload')
                .send([
                    { id: 'TEST_STU_101', name: 'Rohan Verma', email: 'rohan@uni.edu', cgpa: 9.1, department: 'CSE' },
                    { id: 'TEST_STU_102', name: 'Divya Rao', email: 'divya@uni.edu', cgpa: 8.9, department: 'ECE' }
                ]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
        });

        it('POST /api/students/upload should parse CSV formatted candidate roster', async () => {
            const csvData = `id,name,email,cgpa,department\nTEST_CSV_01,Pooja Hegde,pooja@uni.edu,9.4,ISE\nTEST_CSV_02,Kiran Kumar,kiran@uni.edu,8.7,CSE`;
            const res = await request(app)
                .post('/api/students/upload')
                .send({ csv: csvData });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
        });

        it('POST /api/panels/upload should ingest batch interview panels', async () => {
            const res = await request(app)
                .post('/api/panels/upload')
                .send([
                    { id: 'TEST_PANEL_X', name: 'Amazon Cloud Panel', company: 'Amazon', interviewer_name: 'Andy Jassy', virtual_room_url: 'https://chime.aws/test' }
                ]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(1);
        });

        it('POST /api/academic-schedules/upload should ingest academic blocks', async () => {
            const res = await request(app)
                .post('/api/academic-schedules/upload')
                .send([
                    { student_id: 'TEST_STU_101', event_name: 'Digital Signal Processing Lab', start_time: '2026-09-17T04:00:00.000Z', end_time: '2026-09-17T06:00:00.000Z' }
                ]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(1);
        });

        it('POST /api/placement-relations/upload should batch ingest placement relations', async () => {
            const res = await request(app)
                .post('/api/placement-relations/upload')
                .send([
                    { company: 'Uber', panel_id: 'PanelA', track_name: 'High-Throughput Dispatch', venue_room: 'Virtual Room 9', capacity: 2, interviewer_lead: 'Dara K.' }
                ]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(1);
        });
    });

    describe('3. Universal Cascading Deletion Engine', () => {
        it('DELETE /api/students/:id should perform cascading deletion on candidate and associated data', async () => {
            const res = await request(app).delete('/api/students/TEST_STU_101');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/deleted with cascading integrity/i);
        });

        it('DELETE /api/panels/:id should dissolve interview panel and clean associated relations', async () => {
            const res = await request(app).delete('/api/panels/TEST_PANEL_X');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/dissolved/i);
        });
    });
});
