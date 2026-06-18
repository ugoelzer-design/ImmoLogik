import { GlobalRateLimitMiddleware } from './global-rate-limit.middleware';

function createResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return response;
}

describe('GlobalRateLimitMiddleware', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('limits repeated requests from the same IP', () => {
    process.env = {
      ...originalEnv,
      GLOBAL_RATE_LIMIT: '1',
      GLOBAL_RATE_WINDOW_MS: '60000',
    };
    const middleware = new GlobalRateLimitMiddleware();
    const request = {
      headers: {},
      ip: '127.0.0.1',
      path: '/api/v1/objects',
    };
    const response = createResponse();
    const next = jest.fn();

    middleware.use(request as never, response as never, next);
    middleware.use(request as never, response as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        error: 'Too Many Requests',
      }),
    );
  });

  it('does not rate limit health checks', () => {
    process.env = {
      ...originalEnv,
      GLOBAL_RATE_LIMIT: '0',
      GLOBAL_RATE_WINDOW_MS: '60000',
    };
    const middleware = new GlobalRateLimitMiddleware();
    const response = createResponse();
    const next = jest.fn();

    middleware.use(
      {
        headers: {},
        ip: '127.0.0.1',
        path: '/api/v1/health',
      } as never,
      response as never,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });
});
