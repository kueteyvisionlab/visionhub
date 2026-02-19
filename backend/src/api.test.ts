import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index';
import http from 'http';

let server: http.Server;
const TEST_PORT = 4999;

function request(path: string, options: { method?: string } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: TEST_PORT, path, method: options.method || 'GET' },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode!, body: data });
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('API Integration', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });

  it('GET /health returns 200 with status healthy', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('GET /unknown returns 404', async () => {
    const res = await request('/unknown');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/contacts without auth returns 401', async () => {
    const res = await request('/api/v1/contacts');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/deals without auth returns 401', async () => {
    const res = await request('/api/v1/deals');
    expect(res.status).toBe(401);
  });
});
