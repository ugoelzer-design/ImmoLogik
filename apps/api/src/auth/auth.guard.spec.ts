import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createSign, generateKeyPairSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';

function toBase64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: object, privateKey: object, kid = 'test-kid') {
  const encodedHeader = toBase64Url({ alg: 'RS256', kid, typ: 'JWT' });
  const encodedPayload = toBase64Url(payload);
  const signer = createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function createContext(authorization?: string, headers?: Record<string, string>) {
  const request = {
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(headers ?? {}),
    },
  };

  return {
    context: {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never,
    request,
  };
}

describe('AuthGuard', () => {
  const originalEnv = process.env;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const prisma = {
    user: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = {
      ...originalEnv,
      AUTH_MODE: 'entra',
      ENTRA_TENANT_ID: 'tenant-1',
      ENTRA_CLIENT_ID: 'client-1',
    };
    jest.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'erika@example.com',
      displayName: 'Erika Beispiel',
      role: 'ADMIN',
      isActive: true,
      tenantId: 'tenant-db-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant: {
        id: 'tenant-db-1',
        name: 'Default Tenant',
        slug: 'default',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows requests in dev auth mode', async () => {
    process.env.AUTH_MODE = 'dev';
    process.env.DEV_TENANT_SLUG = 'default';
    const guard = new AuthGuard(reflector, prisma);
    const { context, request } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({
      user: {
        externalId: 'dev-user',
        email: 'admin@immologik.local',
        appTenantSlug: 'default',
      },
    });
  });

  it('validates a signed Entra bearer token', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = Math.floor(Date.now() / 1000);
    const token = createJwt(
      {
        aud: 'client-1',
        exp: now + 300,
        iss: 'https://login.microsoftonline.com/tenant-1/v2.0',
        nbf: now - 30,
        name: 'Erika Beispiel',
        oid: 'user-oid-1',
        preferred_username: 'erika@example.com',
        roles: ['ADMIN'],
      },
      privateKey,
    );

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'test-kid' }] }),
    } as Response);

    const guard = new AuthGuard(reflector, prisma);
    const { context, request } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({
      user: {
        externalId: 'user-oid-1',
        email: 'erika@example.com',
        displayName: 'Erika Beispiel',
        roles: ['ADMIN'],
        appTenantSlug: 'default',
      },
    });
  });

  it('allows trusted internal web requests in entra auth mode', async () => {
    process.env.API_INTERNAL_AUTH_TOKEN = 'internal-secret';
    process.env.INTERNAL_USER_EMAIL = 'admin@immologik.local';
    process.env.INTERNAL_TENANT_SLUG = 'default';
    const guard = new AuthGuard(reflector, prisma);
    const { context, request } = createContext(undefined, {
      'x-internal-auth-token': 'internal-secret',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({
      user: {
        externalId: 'internal-web',
        email: 'admin@immologik.local',
        appTenantSlug: 'default',
      },
    });
  });

  it('rejects valid Entra tokens without an active Immologik user', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = Math.floor(Date.now() / 1000);
    const token = createJwt(
      {
        aud: 'client-1',
        exp: now + 300,
        iss: 'https://login.microsoftonline.com/tenant-1/v2.0',
        nbf: now - 30,
        name: 'Unbekannt',
        oid: 'user-oid-2',
        preferred_username: 'unknown@example.com',
      },
      privateKey,
    );

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'test-kid' }] }),
    } as Response);
    jest.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const guard = new AuthGuard(reflector, prisma);
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects tokens for a different audience', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = Math.floor(Date.now() / 1000);
    const token = createJwt(
      {
        aud: 'other-client',
        exp: now + 300,
        iss: 'https://login.microsoftonline.com/tenant-1/v2.0',
      },
      privateKey,
    );

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'test-kid' }] }),
    } as Response);

    const guard = new AuthGuard(reflector, prisma);
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
