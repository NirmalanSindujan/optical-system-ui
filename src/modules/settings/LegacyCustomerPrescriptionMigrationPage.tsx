import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  Clock3,
  Database,
  FileText,
  FileUp,
  Loader2,
  RefreshCcw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  getLegacyCustomerPrescriptionMigrationJobStatus,
  resetDb,
  startLegacyCustomerPrescriptionMigrationJob,
} from "@/modules/settings/legacyMigration.service";
import {
  LEGACY_MIGRATION_JOB_STATUS,
  type LegacyCustomerPrescriptionMigrationJobStartResponse,
  type LegacyCustomerPrescriptionMigrationJobStatusResponse,
  type LegacyCustomerPrescriptionMigrationProgress,
  type LegacyMigrationJobStatus,
} from "@/modules/settings/legacyMigration.types";

const statItems: Array<{
  key: keyof LegacyCustomerPrescriptionMigrationProgress;
  label: string;
}> = [
  { key: "customersProcessed", label: "Customers Processed" },
  { key: "customersCreated", label: "Customers Created" },
  { key: "customersUpdated", label: "Customers Updated" },
  { key: "patientsCreated", label: "Patients Created" },
  { key: "patientsUpdated", label: "Patients Updated" },
  { key: "prescriptionsProcessed", label: "Prescriptions Processed" },
  { key: "prescriptionsCreated", label: "Prescriptions Created" },
  { key: "prescriptionsSkipped", label: "Prescriptions Skipped" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (typeof error.response?.data === "string" && error.response.data.trim()) {
      return error.response.data;
    }

    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The migration request failed.";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function toInitialStatusResponse(
  response: LegacyCustomerPrescriptionMigrationJobStartResponse,
): LegacyCustomerPrescriptionMigrationJobStatusResponse {
  return {
    jobId: response.jobId,
    status: response.status,
    sourceFileName: response.sourceFileName,
    createdAt: response.createdAt,
    startedAt: null,
    finishedAt: null,
    message: null,
    progress: null,
  };
}

function LegacyCustomerPrescriptionMigrationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobSnapshot, setJobSnapshot] =
    useState<LegacyCustomerPrescriptionMigrationJobStatusResponse | null>(null);
  const lastToastStatusRef = useRef<LegacyMigrationJobStatus | null>(null);

  const startJobMutation = useMutation({
    mutationFn: startLegacyCustomerPrescriptionMigrationJob,
    onSuccess: (data) => {
      setJobId(data.jobId);
      setJobSnapshot(toInitialStatusResponse(data));
      lastToastStatusRef.current = null;
      toast({
        title: "Migration job created",
        description: `Queued import for ${data.sourceFileName}.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Migration failed",
        description: getErrorMessage(error),
      });
    },
  });

  const statusQuery = useQuery({
    queryKey: ["legacy-customer-prescriptions-job", jobId],
    queryFn: () => getLegacyCustomerPrescriptionMigrationJobStatus(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? jobSnapshot?.status;
      if (
        status === LEGACY_MIGRATION_JOB_STATUS.QUEUED ||
        status === LEGACY_MIGRATION_JOB_STATUS.RUNNING
      ) {
        return 2000;
      }

      return false;
    },
  });

  const resetDbMutation = useMutation({
    mutationFn: resetDb,
    onSuccess: (data) => {
      toast({
        title: "Database reset completed",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Database reset failed",
        description: getErrorMessage(error),
      });
    },
  });

  useEffect(() => {
    if (statusQuery.data) {
      setJobSnapshot(statusQuery.data);
    }
  }, [statusQuery.data]);

  useEffect(() => {
    const status = statusQuery.data?.status;

    if (!status || lastToastStatusRef.current === status) {
      return;
    }

    if (status === LEGACY_MIGRATION_JOB_STATUS.COMPLETED) {
      toast({
        title: "Migration completed",
        description: `Imported data from ${statusQuery.data.sourceFileName}.`,
      });
      lastToastStatusRef.current = status;
      return;
    }

    if (status === LEGACY_MIGRATION_JOB_STATUS.FAILED) {
      toast({
        variant: "destructive",
        title: "Migration failed",
        description: statusQuery.data.message || "The migration job failed.",
      });
      lastToastStatusRef.current = status;
    }
  }, [statusQuery.data, toast]);

  const activeResponse = jobSnapshot;
  const progress = activeResponse?.progress ?? null;
  const isPolling =
    activeResponse?.status === LEGACY_MIGRATION_JOB_STATUS.QUEUED ||
    activeResponse?.status === LEGACY_MIGRATION_JOB_STATUS.RUNNING;

  const resultText = useMemo(
    () => (activeResponse ? JSON.stringify(activeResponse, null, 2) : ""),
    [activeResponse],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
  };

  const handleSubmit = () => {
    if (!selectedFile || startJobMutation.isPending) {
      return;
    }

    setJobId(null);
    setJobSnapshot(null);
    lastToastStatusRef.current = null;
    queryClient.removeQueries({ queryKey: ["legacy-customer-prescriptions-job"] });
    startJobMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setJobId(null);
    setJobSnapshot(null);
    lastToastStatusRef.current = null;
    queryClient.removeQueries({ queryKey: ["legacy-customer-prescriptions-job"] });
    startJobMutation.reset();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Legacy Customer Prescription Import</CardTitle>
              <CardDescription>
                Upload an old SQL dump, create a background migration job, and monitor live
                progress until it completes or fails.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="rounded-xl border border-dashed bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <FileUp className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">SQL dump file</p>
                  <p className="text-sm text-muted-foreground">
                    The backend creates a job from a multipart upload with the file in the `file`
                    field.
                  </p>
                </div>
                <Input type="file" accept=".sql,.dump,.txt" onChange={handleFileChange} />
                <p className="text-sm text-muted-foreground">
                  {selectedFile
                    ? `Selected file: ${selectedFile.name}`
                    : "Choose the legacy SQL dump you want to import."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} disabled={!selectedFile || startJobMutation.isPending}>
              {startJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Start Import
            </Button>
            <Button
              variant="outline"
              onClick={() => statusQuery.refetch()}
              disabled={!jobId || isPolling || statusQuery.isFetching}
            >
              {statusQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}
              Refresh Status
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={startJobMutation.isPending}>
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {startJobMutation.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {getErrorMessage(startJobMutation.error)}
            </div>
          ) : null}

          {statusQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {getErrorMessage(statusQuery.error)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Migration Status
            </CardTitle>
            <CardDescription>
              Polling runs every 2 seconds while the job is queued or running.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeResponse ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Job Status
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                      {isPolling || statusQuery.isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Clock3 className="h-4 w-4 text-primary" />
                      )}
                      {activeResponse.status}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Job ID
                    </p>
                    <p className="mt-2 truncate text-sm font-medium">{activeResponse.jobId}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Created At
                    </p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(activeResponse.createdAt)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Started At
                    </p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(activeResponse.startedAt)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Finished At
                    </p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(activeResponse.finishedAt)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Source File
                    </p>
                    <p className="mt-2 text-sm font-medium">{activeResponse.sourceFileName}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Message
                  </p>
                  <p className="mt-2 text-sm font-medium">{activeResponse.message || "-"}</p>
                </div>

                {progress ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {statItems.map((item) => (
                      <div key={item.key} className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{progress[item.key]}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Progress counts will appear once the backend starts reporting them.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No job started yet. Upload a file and start the migration to begin polling.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Raw Response</CardTitle>
            <CardDescription>
              JSON output from the latest job start or status response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={resultText}
              placeholder="Response JSON will appear here."
              className="min-h-[260px] font-mono text-xs"
            />
          </CardContent>
        </Card>
      </div>


      <div>
        <Button
          variant="destructive"
          onClick={() => resetDbMutation.mutate()}
          disabled={resetDbMutation.isPending}
        >
          {resetDbMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reset DB
        </Button>
      </div>
    </div>
  );
}

export default LegacyCustomerPrescriptionMigrationPage;
