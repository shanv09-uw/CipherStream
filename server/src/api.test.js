const request = require('supertest');

// Mock the database before requiring index.js to prevent connection errors in CI pipelines
jest.mock('./db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

const { app } = require('./index');

describe('CipherStream Backend API Tests', () => {

  describe('Functional Test: User Login Validation', () => {
    it('should return 400 Bad Request if missing credentials', async () => {
      // Intentionally sending an empty payload to the login endpoint
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'missing_password_user' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Username and password required');
    });
  });

  describe('Security Test: Authentication Boundary Enforcement', () => {
    it('should explicitly reject unauthenticated access to the messages endpoint with 401', async () => {
      // Threat Model mapped test: Attempting to exfiltrate messages without a JWT
      const response = await request(app)
        .get('/api/messages/1'); // Fetching messages for peer ID 1 without an Authorization header

      // Assert that the server blocks the request rather than crashing or leaking data
      expect(response.status).toBe(401);
    });
  });

});
