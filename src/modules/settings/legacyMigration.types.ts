export const LEGACY_MIGRATION_JOB_STATUS = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type LegacyMigrationJobStatus =
  (typeof LEGACY_MIGRATION_JOB_STATUS)[keyof typeof LEGACY_MIGRATION_JOB_STATUS];

export type LegacyCustomerPrescriptionMigrationProgress = {
  sourceFileName: string;
  customersProcessed: number;
  customersCreated: number;
  customersUpdated: number;
  patientsCreated: number;
  patientsUpdated: number;
  prescriptionsProcessed: number;
  prescriptionsCreated: number;
  prescriptionsSkipped: number;
};

export type LegacyCustomerPrescriptionMigrationJobStartResponse = {
  jobId: string;
  status: LegacyMigrationJobStatus;
  sourceFileName: string;
  createdAt: string;
};

export type LegacyCustomerPrescriptionMigrationJobStatusResponse = {
  jobId: string;
  status: LegacyMigrationJobStatus;
  sourceFileName: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  progress: LegacyCustomerPrescriptionMigrationProgress | null;
};

export type ResetDbResponse = {

  "message": string,
  "truncatedTableCount": number,
  "detachedUserCount": number,
  "truncatedTables": string[]

}


