import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  CreateReadingCampaignInput,
  MeterAccess,
  ReadingCampaign,
  SubmitMeterReadingInput,
} from "@/types/meter-reading";

export async function getReadingCampaigns(objectId?: string): Promise<ReadingCampaign[]> {
  return apiClient.get<ReadingCampaign[]>(apiEndpoints.meterReadings.campaigns, {
    query: objectId ? { objectId } : undefined,
  });
}

export async function createReadingCampaign(
  input: CreateReadingCampaignInput,
): Promise<ReadingCampaign> {
  return apiClient.post<ReadingCampaign, CreateReadingCampaignInput>(
    apiEndpoints.meterReadings.campaigns,
    input,
  );
}

export async function getMeterAccess(token: string): Promise<MeterAccess> {
  return apiClient.get<MeterAccess>(apiEndpoints.meterReadings.access(token));
}

export async function submitMeterReadings(
  token: string,
  input: SubmitMeterReadingInput,
): Promise<MeterAccess> {
  return apiClient.post<MeterAccess, SubmitMeterReadingInput>(
    apiEndpoints.meterReadings.submit(token),
    input,
  );
}
