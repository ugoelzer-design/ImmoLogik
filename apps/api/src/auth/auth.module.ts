import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from './auth.guard';

/**
 * Auth-Modul: Registriert den globalen AuthGuard für die gesamte Anwendung.
 * Muss in AppModule importiert werden.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
