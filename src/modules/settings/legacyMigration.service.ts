import api from "@/lib/api";
import type {
  LegacyCustomerPrescriptionMigrationJobStartResponse,
  LegacyCustomerPrescriptionMigrationJobStatusResponse,
} from "@/modules/settings/legacyMigration.types";

export async function startLegacyCustomerPrescriptionMigrationJob(
  file: File,
): Promise<LegacyCustomerPrescriptionMigrationJobStartResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<LegacyCustomerPrescriptionMigrationJobStartResponse>(
    "/migrations/legacy/customers-prescriptions/jobs",
    formData,
  );

  return data;
}

export async function getLegacyCustomerPrescriptionMigrationJobStatus(
  jobId: string,
): Promise<LegacyCustomerPrescriptionMigrationJobStatusResponse> {
  const { data } = await api.get<LegacyCustomerPrescriptionMigrationJobStatusResponse>(
    `/migrations/legacy/customers-prescriptions/jobs/${jobId}`,
  );

  return data;
}
