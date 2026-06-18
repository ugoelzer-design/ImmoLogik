import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { Public } from '../../auth/public.decorator';
import { MieterPortalService } from './mieter-portal.service';

@ApiTags('mieter-portal')
@Controller('mieter-portal')
export class MieterPortalController {
  constructor(private readonly mieterPortalService: MieterPortalService) {}

  /**
   * Verwalter: Portal-Zugang für Mieter erstellen oder erneuern.
   * Gibt den generierten Token-Link zurück.
   */
  @Post('invite/:mieterId')
  createAccess(
    @Param('mieterId') mieterId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.mieterPortalService.createOrRenewAccess(
      mieterId,
      user?.appTenantSlug ?? 'default',
    );
  }

  /**
   * Öffentlich: Alle Portal-Daten für einen Mieter per Token abrufen.
   */
  @Public()
  @Get('access/:token')
  getPortalData(@Param('token') token: string) {
    return this.mieterPortalService.getPortalData(token);
  }

  /**
   * Öffentlich: Dokument-Datei per Token streamen.
   */
  @Public()
  @Get('access/:token/documents/:documentId/file')
  async streamDocument(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.mieterPortalService.streamDocument(token, documentId, res);
  }
}
