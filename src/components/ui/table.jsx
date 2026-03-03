import { cn } from "@/lib/cn";

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/40", className)} {...props} />;
}

function TableHead({ className, ...props }) {
  return (
    <th
      className={cn("h-10 px-4 py-2 text-left align-middle text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-2 align-middle text-sm", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
