interface StatsBarProps {
    success: number;
    failed: number;
    pending: number;
    processing: number;
}

export function StatsBar({ success, failed, pending, processing }: StatsBarProps) {
    const total = success + failed + pending + processing;
    const safeTotal = total || 1;
    const successPct = (success / safeTotal) * 100;
    const processingPct = (processing / safeTotal) * 100;
    const pendingPct = (pending / safeTotal) * 100;
    const failedPct = (failed / safeTotal) * 100;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Job Statistics</span>
                <span className="font-medium">{total} Total</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                {success > 0 && (
                    <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${successPct}%` }}
                    />
                )}
                {processing > 0 && (
                    <div
                        className="bg-blue-500 transition-all duration-500"
                        style={{ width: `${processingPct}%` }}
                    />
                )}
                {pending > 0 && (
                    <div
                        className="bg-yellow-500 transition-all duration-500"
                        style={{ width: `${pendingPct}%` }}
                    />
                )}
                {failed > 0 && (
                    <div
                        className="bg-red-500 transition-all duration-500"
                        style={{ width: `${failedPct}%` }}
                    />
                )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Success: {success}
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Processing: {processing}
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Pending: {pending}
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Failed: {failed}
                </span>
            </div>
        </div>
    );
}
