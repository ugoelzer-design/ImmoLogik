import { EventEmitter } from 'events';
import { RequestLoggingMiddleware } from './request-logging.middleware';

function createResponse(statusCode = 200) {
  const emitter = new EventEmitter() as EventEmitter & {
    setHeader: jest.Mock;
    statusCode: number;
  };
  emitter.statusCode = statusCode;
  emitter.setHeader = jest.fn();
  return emitter;
}

describe('RequestLoggingMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets and logs a request id', () => {
    const middleware = new RequestLoggingMiddleware();
    const response = createResponse(200);
    const next = jest.fn();
    const logSpy = jest
      .spyOn((middleware as unknown as { logger: { log: () => void } }).logger, 'log')
      .mockImplementation();

    middleware.use(
      {
        headers: { 'x-request-id': 'req-1' },
        ip: '127.0.0.1',
        method: 'GET',
        originalUrl: '/api/v1/objects',
        user: {
          email: 'admin@immologik.local',
          appTenantSlug: 'default',
        },
      } as never,
      response as never,
      next,
    );
    response.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"req-1"'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"tenant":"default"'),
    );
  });

  it('logs 4xx as warning and 5xx as error', () => {
    const middleware = new RequestLoggingMiddleware();
    const warnSpy = jest
      .spyOn(
        (middleware as unknown as { logger: { warn: () => void } }).logger,
        'warn',
      )
      .mockImplementation();
    const errorSpy = jest
      .spyOn(
        (middleware as unknown as { logger: { error: () => void } }).logger,
        'error',
      )
      .mockImplementation();
    const warnResponse = createResponse(404);
    const errorResponse = createResponse(500);

    middleware.use(
      {
        headers: {},
        ip: '127.0.0.1',
        method: 'GET',
        originalUrl: '/api/v1/objects',
      } as never,
      warnResponse as never,
      jest.fn(),
    );
    middleware.use(
      {
        headers: {},
        ip: '127.0.0.1',
        method: 'GET',
        originalUrl: '/api/v1/objects',
      } as never,
      errorResponse as never,
      jest.fn(),
    );

    warnResponse.emit('finish');
    errorResponse.emit('finish');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":404'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":500'),
    );
  });
});
