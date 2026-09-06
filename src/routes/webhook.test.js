const request = require('supertest');
const app = require('../index');

describe('POST /api/webhook', () => {
  it('rejects a missing formResponse', async () => {
    const res = await request(app).post('/api/webhook').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formResponse/);
  });

  it('rejects an empty formResponse', async () => {
    const res = await request(app).post('/api/webhook').send({ formResponse: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be empty/);
  });

  it('fails clearly (not a crash) when no AI provider key is configured', async () => {
    const previous = { hf: process.env.HUGGING_FACE_API_KEY, or: process.env.OPENROUTER_API_KEY };
    delete process.env.HUGGING_FACE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const res = await request(app)
      .post('/api/webhook')
      .send({ formResponse: { name: 'Ada', feedback: 'Great product' } });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/No AI provider configured/);

    if (previous.hf) process.env.HUGGING_FACE_API_KEY = previous.hf;
    if (previous.or) process.env.OPENROUTER_API_KEY = previous.or;
  });
});

describe('GET /api/webhook/health', () => {
  it('reports which providers are configured', async () => {
    const res = await request(app).get('/api/webhook/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configuredProviders');
  });
});
