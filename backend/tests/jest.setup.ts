process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret-12';
process.env.ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
