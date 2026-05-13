import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

/**
 * Auth-Modul: Registriert den globalen AuthGuard für die gesamte Anwendung.
 * Muss in AppModule importiert werden.
 */
@Module({
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
