import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type UtilityStatement } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type WorkspaceSettlementInput = {
  id?: string;
  objectId?: string | null;
  objectDisplayId?: string;
  objektDisplayId?: string;
  objectName?: string;
  objektName?: string;
  zeitraumVon?: string;
  zeitraumBis?: string;
  status?: string;
  erstelltAm?: string;
  geaendertAm?: string;
  positivGeprueftAm?: string | null;
  positions?: unknown;
  einheiten?: unknown;
  finalReportSnapshot?: unknown;
};

type SyncWorkspaceInput = {
  settlements?: WorkspaceSettlementInput[];
};

type ListSettlementsFilters = {
  q?: string;
  objectId?: string;
  objectDisplayId?: string;
  status?: string;
  reportYear?: string;
};

type UtilityStatementValidationIssue = {
  code: string;
  message: string;
};

type SanitizedSettlementInput = {
  id: string;
  appTenantId: string;
  objectId: string | null;
  objectDisplayId: string;
  objectName: string;
  reportYear: number | null;
  periodFrom: string;
  periodTo: string;
  status: string;
  settlementCreatedOn: string;
  settlementUpdatedOn: string;
  approvedOn: string | null;
  positions: Prisma.InputJsonValue;
  units: Prisma.InputJsonValue;
  finalReportSnapshot: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

@Injectable()
export class UtilityStatementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSettlements(
    filters: ListSettlementsFilters = {},
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const settlements = await this.prisma.utilityStatement.findMany({
      where: this.buildListWhere(filters, appTenantId),
      orderBy: [{ reportYear: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      settlements: settlements.map((item) => this.mapSettlementSummary(item)),
    };
  }

  async getWorkspace(appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const settlements = await this.prisma.utilityStatement.findMany({
      where: { appTenantId },
      orderBy: [{ reportYear: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      settlements: settlements.map((item) => this.mapSettlement(item)),
    };
  }

  async validateSettlement(
    id: string,
    input?: WorkspaceSettlementInput,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const normalizedId = String(id ?? '').trim();

    if (normalizedId === '') {
      throw new BadRequestException('Abrechnungs-ID fehlt.');
    }

    const existingSettlement = await this.prisma.utilityStatement.findUnique({
      where: { id: normalizedId },
    });

    if (
      (!existingSettlement ||
        this.isDifferentAppTenant(existingSettlement, appTenantId)) &&
      !input
    ) {
      throw new NotFoundException(
        'Nebenkostenabrechnung wurde nicht gefunden.',
      );
    }

    const settlementToValidate = input
      ? await this.sanitizeSettlementInput(
          { ...input, id: normalizedId },
          {
            mode: 'validation',
            existing:
              existingSettlement &&
              !this.isDifferentAppTenant(existingSettlement, appTenantId)
                ? existingSettlement
                : undefined,
            appTenantId,
          },
        )
      : this.mapExistingSettlementToSanitized(existingSettlement!);

    return this.buildValidationResult(settlementToValidate);
  }

  async syncWorkspace(input: SyncWorkspaceInput, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    if (!Array.isArray(input.settlements)) {
      throw new BadRequestException(
        'Nebenkosten-Arbeitsstand muss als Liste übergeben werden.',
      );
    }

    const existingSettlements = await this.prisma.utilityStatement.findMany({
      where: {
        appTenantId,
        id: {
          in: input.settlements.map((item) => this.normalizeId(item.id)),
        },
      },
    });
    const existingById = new Map(
      existingSettlements.map((item) => [item.id, item]),
    );

    const sanitizedSettlements = await Promise.all(
      input.settlements.map((item) =>
        this.sanitizeSettlementInput(item, {
          mode: 'workspace',
          appTenantId,
          existing: existingById.get(this.normalizeId(item.id)),
        }),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      const incomingIds = sanitizedSettlements.map((item) => item.id);
      const incomingObjectDisplayIds = [
        ...new Set(sanitizedSettlements.map((item) => item.objectDisplayId)),
      ];

      if (incomingIds.length > 0 && incomingObjectDisplayIds.length > 0) {
        await tx.utilityStatement.deleteMany({
          where: {
            objectDisplayId: { in: incomingObjectDisplayIds },
            appTenantId,
            id: { notIn: incomingIds },
            status: { not: 'Archiviert' },
          },
        });
      }

      for (const item of sanitizedSettlements) {
        const persistedApprovedState = existingById.get(item.id);
        const nextItem = this.mergeApprovedState(item, persistedApprovedState);

        await tx.utilityStatement.upsert({
          where: { id: nextItem.id },
          update: nextItem,
          create: nextItem,
        });
      }
    });

    return this.getWorkspace(appTenantSlug);
  }

  async approveSettlement(
    id: string,
    input: WorkspaceSettlementInput,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const normalizedId = String(id ?? '').trim();

    if (normalizedId === '') {
      throw new BadRequestException('Abrechnungs-ID fehlt.');
    }

    const existingSettlement = await this.prisma.utilityStatement.findUnique({
      where: { id: normalizedId },
    });

    if (
      !existingSettlement ||
      this.isDifferentAppTenant(existingSettlement, appTenantId)
    ) {
      throw new NotFoundException(
        'Nebenkostenabrechnung wurde nicht gefunden.',
      );
    }

    if (
      existingSettlement.status === 'Archiviert' &&
      existingSettlement.finalReportSnapshot != null
    ) {
      throw new BadRequestException(
        'Die Nebenkostenabrechnung wurde bereits final freigegeben.',
      );
    }

    const sanitizedSettlement = await this.sanitizeSettlementInput(
      {
        ...input,
        id: normalizedId,
      },
      { mode: 'approval', existing: existingSettlement, appTenantId },
    );
    const validation = this.buildValidationResult(sanitizedSettlement);

    if (!validation.isReadyForApproval) {
      throw new BadRequestException(
        `Nebenkostenabrechnung ist noch nicht freigabefähig: ${validation.issues
          .map((issue) => issue.message)
          .join(' | ')}`,
      );
    }

    const finalReportSnapshot = this.toApprovedSnapshot(
      input.finalReportSnapshot,
      sanitizedSettlement.approvedOn,
    );
    const approvedOn =
      sanitizedSettlement.approvedOn ??
      this.extractApprovedOn(finalReportSnapshot) ??
      existingSettlement.approvedOn;

    if (!approvedOn) {
      throw new BadRequestException(
        'Freigabedatum für den finalen Report fehlt.',
      );
    }

    const approvedSettlement: SanitizedSettlementInput = {
      ...sanitizedSettlement,
      status: 'Archiviert',
      approvedOn,
      finalReportSnapshot,
    };

    const savedSettlement = await this.prisma.utilityStatement.update({
      where: { id: normalizedId },
      data: approvedSettlement,
    });

    return this.mapSettlement(savedSettlement);
  }

  private mapExistingSettlementToSanitized(
    item: UtilityStatement,
  ): SanitizedSettlementInput {
    return {
      id: item.id,
      appTenantId: item.appTenantId,
      objectId: item.objectId,
      objectDisplayId: item.objectDisplayId,
      objectName: item.objectName,
      reportYear: item.reportYear,
      periodFrom: item.periodFrom,
      periodTo: item.periodTo,
      status: item.status,
      settlementCreatedOn: item.settlementCreatedOn,
      settlementUpdatedOn: item.settlementUpdatedOn,
      approvedOn: item.approvedOn,
      positions: Array.isArray(item.positions)
        ? (item.positions as Prisma.InputJsonValue)
        : ([] as Prisma.InputJsonValue),
      units: Array.isArray(item.units)
        ? (item.units as Prisma.InputJsonValue)
        : ([] as Prisma.InputJsonValue),
      finalReportSnapshot:
        item.finalReportSnapshot == null
          ? Prisma.JsonNull
          : (item.finalReportSnapshot as Prisma.InputJsonValue),
    };
  }

  private async sanitizeSettlementInput(
    item: WorkspaceSettlementInput,
    options: {
      mode: 'workspace' | 'approval' | 'validation';
      existing?: UtilityStatement | null;
      appTenantId?: string;
    } = { mode: 'workspace' },
  ): Promise<SanitizedSettlementInput> {
    const appTenantId =
      options.appTenantId ?? (await this.resolveAppTenantId('default'));
    const id = this.normalizeId(item.id);
    const objectDisplayId = this.readNormalizedText(
      item.objectDisplayId,
      item.objektDisplayId,
    ).toUpperCase();
    const objectName = this.readNormalizedText(
      item.objectName,
      item.objektName,
    );
    const periodFrom = String(item.zeitraumVon ?? '').trim();
    const periodTo = String(item.zeitraumBis ?? '').trim();
    const settlementCreatedOn = String(item.erstelltAm ?? '').trim();
    const settlementUpdatedOn = String(item.geaendertAm ?? '').trim();
    const approvedOn = item.positivGeprueftAm
      ? String(item.positivGeprueftAm).trim()
      : null;

    if (
      id === '' ||
      objectDisplayId === '' ||
      objectName === '' ||
      periodFrom === '' ||
      periodTo === '' ||
      settlementCreatedOn === '' ||
      settlementUpdatedOn === ''
    ) {
      throw new BadRequestException(
        'Nebenkosten-Arbeitsstand ist unvollständig.',
      );
    }

    const resolvedObjectId = await this.resolveObjectId(
      item.objectId,
      objectDisplayId,
      appTenantId,
    );
    const isPersistedArchived =
      options.existing?.status === 'Archiviert' &&
      options.existing.finalReportSnapshot != null &&
      options.existing.approvedOn != null;

    const status =
      options.mode === 'approval'
        ? 'Archiviert'
        : isPersistedArchived
          ? 'Archiviert'
          : 'In Arbeit';

    return {
      id,
      appTenantId,
      objectId: resolvedObjectId,
      objectDisplayId,
      objectName,
      reportYear:
        this.extractReportYear(periodTo) ?? this.extractReportYear(periodFrom),
      periodFrom,
      periodTo,
      status,
      settlementCreatedOn,
      settlementUpdatedOn,
      approvedOn:
        options.mode === 'approval'
          ? approvedOn
          : isPersistedArchived
            ? (options.existing?.approvedOn ?? null)
            : null,
      positions: this.toJsonValue(item.positions, []),
      units: this.toJsonValue(item.einheiten, []),
      finalReportSnapshot:
        options.mode === 'approval'
          ? this.toJsonValue(item.finalReportSnapshot, null)
          : isPersistedArchived
            ? (options.existing?.finalReportSnapshot as Prisma.InputJsonValue)
            : Prisma.JsonNull,
    };
  }

  private mergeApprovedState(
    item: SanitizedSettlementInput,
    existing: UtilityStatement | undefined,
  ): SanitizedSettlementInput {
    if (
      !existing ||
      existing.status !== 'Archiviert' ||
      existing.approvedOn == null ||
      existing.finalReportSnapshot == null
    ) {
      return item;
    }

    return {
      ...item,
      status: 'Archiviert',
      approvedOn: existing.approvedOn,
      finalReportSnapshot:
        existing.finalReportSnapshot as Prisma.InputJsonValue,
    };
  }

  private async resolveObjectId(
    objectId: string | null | undefined,
    objectDisplayId: string,
    appTenantId: string,
  ) {
    const normalizedObjectId = String(objectId ?? '').trim();

    if (normalizedObjectId !== '') {
      const object = await this.prisma.propertyObject.findFirst({
        where: { id: normalizedObjectId, appTenantId },
        select: { id: true },
      });

      return object?.id ?? null;
    }

    const object = await this.prisma.propertyObject.findFirst({
      where: { displayId: objectDisplayId, appTenantId },
      select: { id: true },
    });

    return object?.id ?? null;
  }

  private extractReportYear(value: string) {
    const match = value.match(/\b(20\d{2})\b/);

    if (!match) {
      return null;
    }

    return Number(match[1]);
  }

  private readNormalizedText(...values: Array<string | null | undefined>) {
    for (const value of values) {
      const normalized = String(value ?? '').trim();

      if (normalized !== '') {
        return normalized;
      }
    }

    return '';
  }

  private toJsonValue(
    value: unknown,
    fallback: [] | null,
  ): Prisma.InputJsonValue {
    if (value === undefined) {
      return fallback as Prisma.InputJsonValue;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toApprovedSnapshot(
    value: unknown,
    approvedOn: string | null,
  ): Prisma.InputJsonValue {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Finaler Report-Snapshot fehlt.');
    }

    const snapshot = JSON.parse(JSON.stringify(value)) as Record<
      string,
      unknown
    >;
    const snapshotApprovedOn = this.extractApprovedOn(snapshot);

    snapshot.freigegebenAm = approvedOn ?? snapshotApprovedOn ?? '';

    if (String(snapshot.freigegebenAm).trim() === '') {
      throw new BadRequestException(
        'Finaler Report-Snapshot enthält kein Freigabedatum.',
      );
    }

    return snapshot as Prisma.InputJsonValue;
  }

  private extractApprovedOn(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const approvedOn = this.readText(
      (value as Record<string, unknown>).freigegebenAm,
    );

    return approvedOn === '' ? null : approvedOn;
  }

  private normalizeId(value: string | undefined) {
    return String(value ?? '').trim();
  }

  private parsePeriod(from: string, to: string) {
    const parsedFrom = this.parseDate(from);
    const parsedTo = this.parseDate(to);

    if (!parsedFrom || !parsedTo || parsedFrom > parsedTo) {
      return null;
    }

    return { from: parsedFrom, to: parsedTo };
  }

  private parseDate(value: string) {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const deMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (deMatch) {
      const [, d, m, y] = deMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private buildListWhere(
    filters: ListSettlementsFilters,
    appTenantId: string,
  ): Prisma.UtilityStatementWhereInput {
    const objectId = String(filters.objectId ?? '').trim();
    const objectDisplayId = String(filters.objectDisplayId ?? '')
      .trim()
      .toUpperCase();
    const normalizedStatus = String(filters.status ?? '').trim();
    const status =
      normalizedStatus === '' || normalizedStatus === 'ALLE'
        ? null
        : normalizedStatus === 'AKTIV'
          ? 'In Arbeit'
          : normalizedStatus;
    const reportYear = this.parseReportYear(filters.reportYear);
    const q = String(filters.q ?? '').trim();

    const where: Prisma.UtilityStatementWhereInput = { appTenantId };

    if (objectId !== '') {
      where.objectId = objectId;
    }

    if (objectDisplayId !== '') {
      where.objectDisplayId = objectDisplayId;
    }

    if (status) {
      where.status = status;
    }

    if (reportYear !== null) {
      where.reportYear = reportYear;
    }

    if (q !== '') {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { objectDisplayId: { contains: q.toUpperCase(), mode: 'insensitive' } },
        { objectName: { contains: q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private parseReportYear(value?: string) {
    const normalized = String(value ?? '').trim();

    if (normalized === '' || normalized === 'ALLE') {
      return null;
    }

    const parsed = Number(normalized);

    return Number.isInteger(parsed) ? parsed : null;
  }

  private buildValidationResult(settlement: SanitizedSettlementInput) {
    const positions = Array.isArray(settlement.positions)
      ? (settlement.positions as Array<Record<string, unknown>>)
      : [];
    const units = Array.isArray(settlement.units)
      ? (settlement.units as Array<Record<string, unknown>>)
      : [];
    const activePositions = positions.filter(
      (position) => this.readAmount(position.betrag) > 0,
    );
    const totalAmount = this.roundToCents(
      positions.reduce(
        (sum, position) => sum + this.readAmount(position.betrag),
        0,
      ),
    );
    const totalAdvancePayments = this.roundToCents(
      units.reduce((sum, unit) => sum + this.readAmount(unit.vorauszahlung), 0),
    );
    const issues: UtilityStatementValidationIssue[] = [];

    if (
      settlement.objectId == null ||
      String(settlement.objectId).trim() === ''
    ) {
      issues.push({
        code: 'object_missing',
        message: 'Objektzuordnung fehlt.',
      });
    }

    if (settlement.reportYear == null) {
      issues.push({
        code: 'report_year_missing',
        message: 'Berichtsjahr fehlt.',
      });
    }

    if (units.length === 0) {
      issues.push({
        code: 'units_missing',
        message: 'Keine Abrechnungseinheiten vorhanden.',
      });
    }

    if (activePositions.length === 0) {
      issues.push({
        code: 'positions_missing',
        message: 'Keine aktiven Kostenpositionen erfasst.',
      });
    }

    const parsedPeriod = this.parsePeriod(
      settlement.periodFrom,
      settlement.periodTo,
    );

    if (parsedPeriod === null) {
      issues.push({
        code: 'period_invalid',
        message: 'Abrechnungszeitraum ist ungültig oder inkonsistent.',
      });
    } else if (
      settlement.reportYear != null &&
      parsedPeriod.to.getFullYear() !== settlement.reportYear
    ) {
      issues.push({
        code: 'report_year_mismatch',
        message: 'Berichtsjahr stimmt nicht mit dem Zeitraumende überein.',
      });
    }

    const unitIds = new Set(
      units
        .map((unit) => this.readText(unit.id))
        .filter((unitId) => unitId !== ''),
    );

    if (units.some((unit) => this.readText(unit.einheit) === '')) {
      issues.push({
        code: 'unit_label_missing',
        message: 'Mindestens eine Einheit hat keine Bezeichnung.',
      });
    }

    if (units.some((unit) => this.readAmount(unit.vorauszahlung) < 0)) {
      issues.push({
        code: 'negative_advance',
        message: 'Mindestens eine Einheit hat eine negative Vorauszahlung.',
      });
    }

    if (
      positions.some((position) => {
        const directUnitId = this.readText(position.direkteEinheitId);
        const distributionKey = this.readText(position.verteilschluessel);

        return (
          distributionKey === 'Direkt' &&
          (directUnitId === '' || !unitIds.has(directUnitId))
        );
      })
    ) {
      issues.push({
        code: 'direct_unit_invalid',
        message:
          'Direkte Kostenpositionen sind nicht sauber einer Einheit zugeordnet.',
      });
    }

    if (
      activePositions.some(
        (position) => this.readText(position.bezeichnung) === '',
      )
    ) {
      issues.push({
        code: 'position_label_missing',
        message: 'Mindestens eine aktive Kostenposition hat keine Bezeichnung.',
      });
    }

    if (totalAmount <= 0) {
      issues.push({
        code: 'total_amount_invalid',
        message: 'Die Abrechnungssumme ist noch nicht positiv.',
      });
    }

    return {
      isReadyForApproval: issues.length === 0,
      issues,
      metrics: {
        activePositionsCount: activePositions.length,
        unitsCount: units.length,
        totalAmount,
        totalAdvancePayments,
      },
    };
  }

  private readAmount(value: unknown) {
    const numeric =
      typeof value === 'number'
        ? value
        : Number(this.readText(value).replace(',', '.'));

    return Number.isFinite(numeric) ? numeric : 0;
  }

  private readText(value: unknown) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim();
    }

    return '';
  }

  private roundToCents(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private mapSettlement(item: UtilityStatement) {
    return {
      id: item.id,
      objectId: item.objectId,
      objektDisplayId: item.objectDisplayId,
      objektName: item.objectName,
      zeitraumVon: item.periodFrom,
      zeitraumBis: item.periodTo,
      status: item.status,
      erstelltAm: item.settlementCreatedOn,
      geaendertAm: item.settlementUpdatedOn,
      positivGeprueftAm: item.approvedOn,
      positions: Array.isArray(item.positions) ? item.positions : [],
      einheiten: Array.isArray(item.units) ? item.units : [],
      finalReportSnapshot:
        item.finalReportSnapshot && typeof item.finalReportSnapshot === 'object'
          ? item.finalReportSnapshot
          : null,
    };
  }

  private async resolveAppTenantId(appTenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: appTenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden.');
    }

    return tenant.id;
  }

  private isDifferentAppTenant(
    record: { appTenantId?: string | null },
    appTenantId: string,
  ) {
    return record.appTenantId !== undefined && record.appTenantId !== appTenantId;
  }

  private mapSettlementSummary(item: UtilityStatement) {
    return {
      id: item.id,
      objectId: item.objectId,
      objektDisplayId: item.objectDisplayId,
      objektName: item.objectName,
      zeitraumVon: item.periodFrom,
      zeitraumBis: item.periodTo,
      reportYear: item.reportYear,
      status: item.status,
      erstelltAm: item.settlementCreatedOn,
      geaendertAm: item.settlementUpdatedOn,
      positivGeprueftAm: item.approvedOn,
    };
  }
}
