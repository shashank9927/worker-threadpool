"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Eye, RotateCcw, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Job {
    _id: string;
    taskName: string;
    type: 'CUSTOM';
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    intensity: number;
    result?: string;
    error?: string;
    createdBy: string;
    workerId?: number;
    progress: number;
    createdAt: string;
    updatedAt: string;
}

interface JobTableProps {
    jobs: Job[];
    onRetry: (jobId: string) => void;
}

export function JobTable({ jobs, onRetry }: JobTableProps) {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    const getStatusBadge = (status: string) => {
        const styles = {
            SUCCESS: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            FAILED: 'bg-red-500/10 text-red-500 border-red-500/20',
            PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        };

        const icons = {
            SUCCESS: <CheckCircle2 className="h-3.5 w-3.5" />,
            FAILED: <XCircle className="h-3.5 w-3.5" />,
            PROCESSING: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
            PENDING: <Clock className="h-3.5 w-3.5" />,
        };

        return (
            <Badge variant="outline" className={`${styles[status as keyof typeof styles]} flex items-center gap-1.5`}>
                {icons[status as keyof typeof icons]}
                {status}
            </Badge>
        );
    };


    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    return (
        <div className="rounded-lg border border-border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20%]">Task Name</TableHead>
                        <TableHead className="w-[10%]">Priority</TableHead>
                        <TableHead className="w-[10%]">Status</TableHead>
                        <TableHead className="w-[10%]">Duration</TableHead>
                        <TableHead className="w-[10%]">Worker</TableHead>
                        <TableHead className="w-[10%]">Created</TableHead>
                        <TableHead className="w-[10%]">Updated</TableHead>
                        <TableHead className="w-[12%] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jobs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                                No jobs yet. Create one to get started!
                            </TableCell>
                        </TableRow>
                    ) : (
                        jobs.map((job) => (
                            <TableRow key={job._id}>
                                <TableCell className="align-middle text-sm font-medium">{job.taskName}</TableCell>
                                <TableCell className="align-middle">
                                    <Badge variant="outline" className={
                                        job.priority === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            job.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    }>
                                        {job.priority}
                                    </Badge>
                                </TableCell>
                                <TableCell className="align-middle">{getStatusBadge(job.status)}</TableCell>
                                <TableCell className="align-middle text-sm">
                                    {(job.status === 'SUCCESS' || job.status === 'FAILED') ? (
                                        <span>{((new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()) / 1000).toFixed(2)}s</span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="align-middle">
                                    {job.workerId !== undefined && job.workerId !== null ? (
                                        <span className="text-sm">Worker {job.workerId}</span>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="align-middle text-sm text-muted-foreground">
                                    {formatTime(job.createdAt)}
                                </TableCell>
                                <TableCell className="align-middle text-sm text-muted-foreground">
                                    {formatTime(job.updatedAt)}
                                </TableCell>
                                <TableCell className="align-middle text-right">
                                    <div className="flex justify-end gap-2">
                                        <Sheet>
                                            <SheetTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSelectedJob(job)}
                                                    title="View job details"
                                                    className="cursor-pointer"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent className="overflow-y-auto">
                                                <SheetHeader>
                                                    <SheetTitle>Job Details</SheetTitle>
                                                    <SheetDescription>
                                                        Complete information about this job
                                                    </SheetDescription>
                                                </SheetHeader>
                                                {selectedJob && (
                                                    <div className="mt-6 space-y-4 pb-64">
                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Task Name
                                                            </div>
                                                            <div className="text-sm font-medium">{selectedJob.taskName}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Job ID
                                                            </div>
                                                            <div className="text-sm font-mono">{selectedJob._id}</div>
                                                        </div>

                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Intensity
                                                            </div>
                                                            <div className="text-sm">{selectedJob.intensity || 30}/100</div>
                                                        </div>

                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Status
                                                            </div>
                                                            <div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
                                                        </div>


                                                        {selectedJob.result && (
                                                            <div>
                                                                <div className="text-sm font-medium text-muted-foreground">
                                                                    Result
                                                                </div>
                                                                <div className="mt-1 rounded-md bg-muted p-3 text-sm font-mono">
                                                                    {selectedJob.result}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedJob.error && (
                                                            <div>
                                                                <div className="text-sm font-medium text-muted-foreground">
                                                                    Error
                                                                </div>
                                                                <div className="mt-1 rounded-md bg-red-500/10 p-3 text-sm font-mono text-red-500">
                                                                    {selectedJob.error}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Created At
                                                            </div>
                                                            <div className="text-sm">
                                                                {new Date(selectedJob.createdAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-muted-foreground">
                                                                Updated At
                                                            </div>
                                                            <div className="text-sm">
                                                                {new Date(selectedJob.updatedAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </SheetContent>
                                        </Sheet>
                                        {job.status === 'FAILED' && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onRetry(job._id)}
                                                title="Retry failed job"
                                                className="cursor-pointer"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
