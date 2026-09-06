const request = require('supertest');

describe('server', () => {
  it('responds to /health', async () => {
    const app = require('./index');
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('404s on an unknown route', async () => {
    const app = require('./index');
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });
});
