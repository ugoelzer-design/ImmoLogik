import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { NebenkostenAbrechnung } from "@/types/nebenkosten";

export type UtilityStatementsWorkspaceSettlement = {
  id: string;
  objectId?: string | null;
  objektDisplayId: string;
  objektName: string;
  zeitraumVon: string;
  zeitraumBis: string;
  status: string;
  erstelltAm: string;
  geaendertAm: string;
  positivGeprueftAm?: string | null;
  positions: unknown[];
  einheiten: unknown[];
  finalReportSnapshot: Record<string, unknown> | null;
};

export type UtilityStatementsListSettlement = {
  id: string;
  objectId?: string | null;
  objektDisplayId: string;
  objektName: string;
  zeitraumVon: string;
  zeitraumBis: string;
  reportYear?: number | null;
  status: string;
  erstelltAm: string;
  geaendertAm: string;
  positivGeprueftAm?: string | null;
};

export type UtilityStatementsListQuery = {
  q?: string;
  objectId?: string;
  objectDisplayId?: string;
  status?: string;
  reportYear?: string;
};

export type UtilityStatementsListResponse = {
  settlements: UtilityStatementsListSettlement[];
};

export type UtilityStatementValidationResponse = {
  isReadyForApproval: boolean;
  issues: Array<{
    code: string;
    message: string;
  }>;
  metrics: {
    activePositionsCount: number;
    unitsCount: number;
    totalAmount: number;
    totalAdvancePayments: number;
  };
};

export type UtilityStatementsWorkspaceResponse = {
  settlements: UtilityStatementsWorkspaceSettlement[];
};

export type UtilityStatementsWorkspacePayload = {
  settlements: Array<{
    id: string;
    objectId?: string | null;
    objektDisplayId: string;
    objektName: string;
    zeitraumVon: string;
    zeitraumBis: string;
    status: NebenkostenAbrechnung["status"];
    erstelltAm: string;
    geaendertAm: string;
    positivGeprueftAm?: string | null;
    positions: unknown[];
    einheiten: unknown[];
    finalReportSnapshot: unknown;
  }>;
};

export async function getUtilityStatementsWorkspace() {
  return apiClient.get<UtilityStatementsWorkspaceResponse>(
    apiEndpoints.utilityStatements.workspace,
  );
}

export async function listUtilityStatements(query?: UtilityStatementsListQuery) {
  return apiClient.get<UtilityStatementsListResponse>(
    apiEndpoints.utilityStatements.list,
    { query },
  );
}

export async function getUtilityStatementValidation(id: string) {
  return apiClient.get<UtilityStatementValidationResponse>(
    apiEndpoints.utilityStatements.validation(id),
  );
}

export async function syncUtilityStatementsWorkspace(
  payload: UtilityStatementsWorkspacePayload,
) {
  return apiClient.put<UtilityStatementsWorkspaceResponse, UtilityStatementsWorkspacePayload>(
    apiEndpoints.utilityStatements.workspace,
    payload,
  );
}

export async function approveUtilityStatement(
  id: string,
  payload: UtilityStatementsWorkspacePayload["settlements"][number],
) {
  return apiClient.post<UtilityStatementsWorkspaceSettlement, typeof payload>(
    apiEndpoints.utilityStatements.approve(id),
    payload,
  );
}
