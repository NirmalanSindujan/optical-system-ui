import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Building2, Landmark, Loader2, Wallet } from "lucide-react";
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
import BranchSelect from "@/modules/branches/components/BranchSelect";
import { formatMoney } from "@/modules/customer-bills/customer-bill.utils";
import {
  createOpeningBalance,
  type OpeningBalancePayload,
  type OpeningBalanceResponse,
} from "@/modules/settings/openingBalance.service";

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (typeof error.response?.data === "string" && error.response.data.trim()) {
      return error.response.data;
    }

    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Opening balance configuration failed.";
}

function OpeningBalancesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [cashInHand, setCashInHand] = useState("");
  const [cashInBank, setCashInBank] = useState("");
  const [loadDate, setLoadDate] = useState(getTodayDateValue());
  const [reference, setReference] = useState("INITIAL-LOAD");
  const [notes, setNotes] = useState("");
  const [latestResponse, setLatestResponse] = useState<OpeningBalanceResponse | null>(null);

  const parsedCashInHand = toPositiveNumber(cashInHand);
  const parsedCashInBank = toPositiveNumber(cashInBank);
  const today = getTodayDateValue();

  const validationMessage = useMemo(() => {
    if (!loadDate) return "Load date is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loadDate)) return "Load date must use YYYY-MM-DD format.";
    if (loadDate > today) return `Load date cannot be after ${today}.`;

    if (Number.isNaN(parsedCashInHand) || Number.isNaN(parsedCashInBank)) {
      return "Cash amounts must be valid numbers.";
    }

    if (parsedCashInHand <= 0 && parsedCashInBank <= 0) {
      return "Enter a value greater than 0 for cash in hand, cash in bank, or both.";
    }

    if (parsedCashInHand > 0 && branchId == null) {
      return "Branch is required when loading cash in hand.";
    }

    return null;
  }, [branchId, loadDate, parsedCashInBank, parsedCashInHand, today]);

  const submitMutation = useMutation({
    mutationFn: (payload: OpeningBalancePayload) => createOpeningBalance(payload),
    onSuccess: (data) => {
      setLatestResponse(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "business-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "cash-ledger"] });
      toast({
        title: "Opening balances configured",
        description: "The initial cash setup was saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Configuration failed",
        description: getErrorMessage(error),
      });
    },
  });

  const handleSubmit = () => {
    if (validationMessage || submitMutation.isPending) return;

    const payload: OpeningBalancePayload = {
      loadDate,
      ...(parsedCashInHand > 0 ? { cashInHand: parsedCashInHand, branchId: branchId as number } : {}),
      ...(parsedCashInBank > 0 ? { cashInBank: parsedCashInBank } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    submitMutation.mutate(payload);
  };

  const handleReset = () => {
    setBranchId(null);
    setCashInHand("");
    setCashInBank("");
    setLoadDate(getTodayDateValue());
    setReference("INITIAL-LOAD");
    setNotes("");
    setLatestResponse(null);
    submitMutation.reset();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">Opening Balances</CardTitle>
          <CardDescription>
            Configure one-time opening cash for branch cash in hand, the primary bank account, or both.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
            This action is one-time only. Branch cash can only be initialized once per branch, and
            bank cash can only be initialized once for the primary bank account.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Branch</p>
              <BranchSelect
                value={branchId}
                onChange={(branch) => setBranchId(branch?.id ?? null)}
                placeholder="Select branch for cash in hand"
              />
              <p className="text-xs text-muted-foreground">
                Required only when `cashInHand` is greater than 0.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Load Date</p>
              <Input type="date" value={loadDate} onChange={(event) => setLoadDate(event.target.value)} />
              <p className="text-xs text-muted-foreground">Required. Use YYYY-MM-DD and do not choose a future date.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Cash In Hand</p>
              <Input
                inputMode="decimal"
                placeholder="50000.00"
                value={cashInHand}
                onChange={(event) => setCashInHand(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Branch-specific opening cash. Leave blank for bank-only setup.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Cash In Bank</p>
              <Input
                inputMode="decimal"
                placeholder="250000.00"
                value={cashInBank}
                onChange={(event) => setCashInBank(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Global opening bank cash for the primary bank account.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Reference</p>
              <Input
                placeholder="INITIAL-LOAD"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Initial treasury setup"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {validationMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {validationMessage}
            </div>
          ) : null}

          {submitMutation.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {getErrorMessage(submitMutation.error)}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} disabled={Boolean(validationMessage) || submitMutation.isPending}>
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Save Opening Balances
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={submitMutation.isPending}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Payload Preview</CardTitle>
            <CardDescription>
              The request includes only positive amounts and the required branch identifier when cash in hand is used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              className="min-h-[220px] font-mono text-xs"
              value={JSON.stringify({
                ...(parsedCashInHand > 0 ? { branchId } : {}),
                ...(parsedCashInHand > 0 ? { cashInHand: parsedCashInHand } : {}),
                ...(parsedCashInBank > 0 ? { cashInBank: parsedCashInBank } : {}),
                loadDate,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              }, null, 2)}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Latest Response</CardTitle>
            <CardDescription>
              Shows the backend result after a successful opening balance load.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestResponse ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Branch</p>
                    <p className="mt-2 text-sm font-medium">
                      {latestResponse.branchCode && latestResponse.branchName
                        ? `${latestResponse.branchCode} - ${latestResponse.branchName}`
                        : "Bank only"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Load Date</p>
                    <p className="mt-2 text-sm font-medium">{latestResponse.loadDate}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      Branch Cash
                    </p>
                    <p className="mt-2 text-lg font-semibold">{formatMoney(latestResponse.cashInHand)}</p>
                    <p className="text-sm text-muted-foreground">
                      Balance: {formatMoney(latestResponse.branchCashBalance ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transaction ID: {latestResponse.cashTransactionId ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <Landmark className="h-3.5 w-3.5" />
                      Bank Cash
                    </p>
                    <p className="mt-2 text-lg font-semibold">{formatMoney(latestResponse.cashInBank)}</p>
                    <p className="text-sm text-muted-foreground">
                      Balance: {formatMoney(latestResponse.bankBalance ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transaction ID: {latestResponse.bankTransactionId ?? "-"}
                    </p>
                  </div>
                </div>

                <Textarea
                  readOnly
                  className="min-h-[180px] font-mono text-xs"
                  value={JSON.stringify(latestResponse, null, 2)}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No opening balance has been submitted from this screen yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OpeningBalancesPage;
