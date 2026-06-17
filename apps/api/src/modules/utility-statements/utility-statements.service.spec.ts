/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UtilityStatementsService } from './utility-statements.service';

describe('UtilityStatementsService', () => {
  let service: UtilityStatementsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
    utilityStatement: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      deleteMany?: jest.Mock;
      upsert?: jest.Mock;
    };
    propertyObject: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      utilityStatement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      propertyObject: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new UtilityStatementsService(prisma as never);
  });

  it('accepts frontend field names when syncing the workspace', async () => {
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const upsert = jest.fn().mockResolvedValue(undefined);

    prisma.propertyObject.findFirst.mockResolvedValueOnce({ id: 'obj-1' });
    prisma.utilityStatement.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'BKA-2025-001',
          objectId: 'obj-1',
          objectDisplayId: 'WEG-001',
          objectName: 'Sonnenhof',
          reportYear: 2025,
          periodFrom: '2025-01-01',
          periodTo: '2025-12-31',
          status: 'In Arbeit',
          settlementCreatedOn: '06.04.2026',
          settlementUpdatedOn: '06.04.2026',
          approvedOn: null,
          positions: [],
          units: [],
          finalReportSnapshot: null,
          updatedAt: new Date('2026-04-06T10:00:00.000Z'),
        },
      ]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        utilityStatement: {
          deleteMany,
          upsert,
        },
      }),
    );

    const result = await service.syncWorkspace({
      settlements: [
        {
          id: 'BKA-2025-001',
          objektDisplayId: 'WEG-001',
          objektName: 'Sonnenhof',
          zeitraumVon: '2025-01-01',
          zeitraumBis: '2025-12-31',
          status: 'In Arbeit',
          erstelltAm: '06.04.2026',
          geaendertAm: '06.04.2026',
          positions: [],
          einheiten: [],
          finalReportSnapshot: null,
        },
      ],
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'BKA-2025-001' },
      update: expect.objectContaining({
        objectId: 'obj-1',
        objectDisplayId: 'WEG-001',
        objectName: 'Sonnenhof',
      }),
      create: expect.objectContaining({
        objectId: 'obj-1',
        objectDisplayId: 'WEG-001',
        objectName: 'Sonnenhof',
      }),
    });
    expect(result).toEqual({
      settlements: [
        expect.objectContaining({
          id: 'BKA-2025-001',
          objektDisplayId: 'WEG-001',
          objektName: 'Sonnenhof',
          status: 'In Arbeit',
        }),
      ],
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        objectDisplayId: { in: ['WEG-001'] },
        appTenantId: 'tenant-1',
        id: { notIn: ['BKA-2025-001'] },
        status: { not: 'Archiviert' },
      },
    });
  });

  it('does not wipe the workspace when an empty settlement list is synced', async () => {
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const upsert = jest.fn().mockResolvedValue(undefined);

    prisma.utilityStatement.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'BKA-2025-001',
          objectId: 'obj-1',
          objectDisplayId: 'WEG-001',
          objectName: 'Sonnenhof',
          reportYear: 2025,
          periodFrom: '2025-01-01',
          periodTo: '2025-12-31',
          status: 'In Arbeit',
          settlementCreatedOn: '06.04.2026',
          settlementUpdatedOn: '06.04.2026',
          approvedOn: null,
          positions: [],
          units: [],
          finalReportSnapshot: null,
          updatedAt: new Date('2026-04-06T10:00:00.000Z'),
        },
      ]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        utilityStatement: {
          deleteMany,
          upsert,
        },
      }),
    );

    const result = await service.syncWorkspace({ settlements: [] });

    expect(deleteMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(result.settlements).toEqual([
      expect.objectContaining({
        id: 'BKA-2025-001',
        objektDisplayId: 'WEG-001',
      }),
    ]);
  });

  it('loads the utility statements list with object, status, year and search filters', async () => {
    prisma.utilityStatement.findMany.mockResolvedValueOnce([]);

    await service.listSettlements({
      q: 'sonnen',
      objectDisplayId: 'WEG-001',
      status: 'AKTIV',
      reportYear: '2025',
    });

    expect(prisma.utilityStatement.findMany).toHaveBeenCalledWith({
      where: {
        appTenantId: 'tenant-1',
        objectDisplayId: 'WEG-001',
        status: 'In Arbeit',
        reportYear: 2025,
        OR: [
          { id: { contains: 'sonnen', mode: 'insensitive' } },
          { objectDisplayId: { contains: 'SONNEN', mode: 'insensitive' } },
          { objectName: { contains: 'sonnen', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ reportYear: 'desc' }, { updatedAt: 'desc' }],
    });
  });

  it('validates a settlement with missing units and positions as not ready for approval', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2025-001',
      objectId: 'obj-1',
      objectDisplayId: 'WEG-001',
      objectName: 'Sonnenhof',
      reportYear: 2025,
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      status: 'In Arbeit',
      settlementCreatedOn: '06.04.2026',
      settlementUpdatedOn: '06.04.2026',
      approvedOn: null,
      positions: [],
      units: [],
      finalReportSnapshot: null,
    });

    const result = await service.validateSettlement('BKA-2025-001');

    expect(result).toEqual({
      isReadyForApproval: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'units_missing' }),
        expect.objectContaining({ code: 'positions_missing' }),
      ]),
      metrics: expect.objectContaining({
        activePositionsCount: 0,
        unitsCount: 0,
      }),
    });
  });

  it('approves a utility statement with archived status and final snapshot', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2025-001',
      status: 'In Arbeit',
      approvedOn: null,
    });
    prisma.propertyObject.findFirst.mockResolvedValueOnce({ id: 'obj-1' });
    prisma.utilityStatement.update.mockResolvedValueOnce({
      id: 'BKA-2025-001',
      objectId: 'obj-1',
      objectDisplayId: 'WEG-001',
      objectName: 'Sonnenhof',
      reportYear: 2025,
      periodFrom: '2025-01-01',
      periodTo: '2025-12-31',
      status: 'Archiviert',
      settlementCreatedOn: '06.04.2026',
      settlementUpdatedOn: '06.04.2026',
      approvedOn: '06.04.2026',
      positions: [],
      units: [],
      finalReportSnapshot: {
        freigegebenAm: '06.04.2026',
        report: { id: 'report-1' },
      },
    });

    const result = await service.approveSettlement('BKA-2025-001', {
      objektDisplayId: 'WEG-001',
      objektName: 'Sonnenhof',
      zeitraumVon: '2025-01-01',
      zeitraumBis: '2025-12-31',
      status: 'Archiviert',
      erstelltAm: '06.04.2026',
      geaendertAm: '06.04.2026',
      positivGeprueftAm: '06.04.2026',
      positions: [
        {
          id: 'pos-1',
          bezeichnung: 'Allgemeinstrom',
          betrag: 180.5,
          verteilschluessel: 'MEA',
        },
      ],
      einheiten: [
        {
          id: 'unit-1',
          einheit: 'WE 01',
          vorauszahlung: 150,
        },
      ],
      finalReportSnapshot: {
        freigegebenAm: '06.04.2026',
        report: { id: 'report-1' },
      },
    });

    expect(prisma.utilityStatement.update).toHaveBeenCalledWith({
      where: { id: 'BKA-2025-001' },
      data: expect.objectContaining({
        status: 'Archiviert',
        approvedOn: '06.04.2026',
        finalReportSnapshot: expect.objectContaining({
          freigegebenAm: '06.04.2026',
        }),
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'BKA-2025-001',
        status: 'Archiviert',
        positivGeprueftAm: '06.04.2026',
      }),
    );
  });

  it('rejects an approval without a final report snapshot', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2025-001',
      approvedOn: null,
    });
    prisma.propertyObject.findFirst.mockResolvedValueOnce({ id: 'obj-1' });

    await expect(
      service.approveSettlement('BKA-2025-001', {
        objektDisplayId: 'WEG-001',
        objektName: 'Sonnenhof',
        zeitraumVon: '2025-01-01',
        zeitraumBis: '2025-12-31',
        status: 'Archiviert',
        erstelltAm: '06.04.2026',
        geaendertAm: '06.04.2026',
        positivGeprueftAm: '06.04.2026',
        positions: [],
        einheiten: [],
        finalReportSnapshot: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects approval when the settlement is not ready for approval', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2025-001',
      status: 'In Arbeit',
      approvedOn: null,
    });
    prisma.propertyObject.findFirst.mockResolvedValueOnce({ id: 'obj-1' });

    await expect(
      service.approveSettlement('BKA-2025-001', {
        objektDisplayId: 'WEG-001',
        objektName: 'Sonnenhof',
        zeitraumVon: '2025-01-01',
        zeitraumBis: '2025-12-31',
        status: 'Archiviert',
        erstelltAm: '06.04.2026',
        geaendertAm: '06.04.2026',
        positivGeprueftAm: '06.04.2026',
        positions: [],
        einheiten: [],
        finalReportSnapshot: {
          freigegebenAm: '06.04.2026',
          report: { id: 'report-1' },
        },
      }),
    ).rejects.toThrow('Nebenkostenabrechnung ist noch nicht freigabefähig');
  });

  it('rejects approval for an unknown utility statement id', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.approveSettlement('BKA-UNBEKANNT', {
        objektDisplayId: 'WEG-001',
        objektName: 'Sonnenhof',
        zeitraumVon: '2025-01-01',
        zeitraumBis: '2025-12-31',
        status: 'Archiviert',
        erstelltAm: '06.04.2026',
        geaendertAm: '06.04.2026',
        positivGeprueftAm: '06.04.2026',
        positions: [],
        einheiten: [],
        finalReportSnapshot: {
          freigegebenAm: '06.04.2026',
          report: { id: 'report-1' },
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks approval when a settlement is already archived with a final snapshot', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2024-001',
      status: 'Archiviert',
      approvedOn: '01.01.2025',
      finalReportSnapshot: { freigegebenAm: '01.01.2025' },
    });

    await expect(
      service.approveSettlement('BKA-2024-001', {
        objektDisplayId: 'WEG-001',
        objektName: 'Sonnenhof',
        zeitraumVon: '2024-01-01',
        zeitraumBis: '2024-12-31',
        status: 'Archiviert',
        erstelltAm: '01.01.2025',
        geaendertAm: '01.01.2025',
        positivGeprueftAm: '01.01.2025',
        positions: [],
        einheiten: [],
        finalReportSnapshot: { freigegebenAm: '01.01.2025' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('flags an invalid or mismatching period during validation', async () => {
    prisma.utilityStatement.findUnique.mockResolvedValueOnce({
      id: 'BKA-2026-001',
      objectId: 'obj-1',
      objectDisplayId: 'WEG-001',
      objectName: 'Sonnenhof',
      reportYear: 2025,
      periodFrom: '2025-02-01',
      periodTo: '2026-01-31',
      status: 'In Arbeit',
      settlementCreatedOn: '06.04.2026',
      settlementUpdatedOn: '06.04.2026',
      approvedOn: null,
      positions: [{ betrag: 100 }],
      units: [{ id: 'unit-1', einheit: 'WE 01', vorauszahlung: 0 }],
      finalReportSnapshot: null,
    });

    const validation = await service.validateSettlement('BKA-2026-001');

    expect(validation.isReadyForApproval).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'report_year_mismatch' }),
      ]),
    );
  });
});
