"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { StatsBar } from "@/components/StatsBar";
import { WorkerPool } from "@/components/WorkerPool";
import { JobTable } from "@/components/JobTable";
import { JobBuilder } from "@/components/JobBuilder";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Toaster, toast } from "sonner";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Job {
  _id: string;
  taskName: string;
  type: "CUSTOM";
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  intensity: number;
  result?: string;
  error?: string;
  createdBy: string;
  workerId?: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface Worker {
  id: number;
  status: "IDLE" | "BUSY";
  currentJobId?: string;
  progress?: number;
}

interface JobProgressEvent {
  jobId: string;
  progress: number;
  workerId: number;
}

interface WorkerStatusEvent {
  workerId: number;
  status: "IDLE" | "BUSY";
  currentJobId?: string;
}

interface WorkerRestartedEvent {
  workerId: number;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: 0, status: "IDLE", progress: 0 },
    { id: 1, status: "IDLE", progress: 0 },
  ]);
  const [connected, setConnected] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [clientId] = useState(() => `client_${Math.random().toString(36).substring(2, 11)}`);
  const socketRef = useRef<Socket | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs?clientId=${clientId}`);
      const data = await response.json();
      setJobs(data);
    } catch {}
  }, [clientId]);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setIsWakingUp(false);
      fetchJobs();
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("job:created", (job: Job) => {
      setJobs(prev => [job, ...prev]);
    });

    socket.on("job:updated", (job: Job) => {
      const updatedJob =
        job.status === "SUCCESS" || job.status === "FAILED"
          ? { ...job, progress: 100 }
          : job;

      setJobs(prev => prev.map(j => (j._id === job._id ? updatedJob : j)));
    });

    socket.on("job:progress", ({ jobId, progress, workerId }: JobProgressEvent) => {
      setJobs(prev => prev.map(j => (j._id === jobId ? { ...j, progress } : j)));
      setWorkers(prev => prev.map(w => (w.id === workerId ? { ...w, progress } : w)));
    });

    socket.on("worker:status", ({ workerId, status, currentJobId }: WorkerStatusEvent) => {
      setWorkers(prev =>
        prev.map(w =>
          w.id === workerId
            ? { ...w, status, currentJobId, progress: status === "IDLE" ? 0 : w.progress }
            : w
        )
      );
    });

    socket.on("worker:restarted", ({ workerId }: WorkerRestartedEvent) => {
      toast.success(`Worker ${workerId} restarted`, {
        description: "Worker thread terminated and recreated",
      });
    });

    socket.on("system-alert", ({ message }: { message: string; workerId: number }) => {
      toast.warning("⚠️ System Recovery", {
        description: message,
        duration: 5000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchJobs]);

  useEffect(() => {
    if (!connected && isWakingUp && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [connected, isWakingUp, countdown]);

  const createJob = async (taskName: string, priority: string, intensity: number) => {
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName,
          priority,
          intensity,
          type: "CUSTOM",
          createdBy: clientId,
        }),
      });

      if (response.ok) {
        toast.success("Job submitted", {
          description: `${taskName} added to queue (Intensity: ${intensity})`,
        });
      }
    } catch {
      toast.error("Failed to create job", {
        description: "Could not connect to server",
      });
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/jobs/${jobId}/retry`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Job queued for retry");
      }
    } catch {
      toast.error("Failed to retry job");
    }
  };

  const restartWorker = async (workerId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/workers/${workerId}/restart`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error("Failed to restart worker", {
          description: data.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Failed to restart worker", {
        description: "Could not connect to server",
      });
    }
  };

  const clearAllJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs?clearAll=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        setJobs([]);
        toast.success("All jobs cleared", {
          description: "Database has been reset",
        });
      } else {
        const data = await response.json();
        toast.error("Failed to clear jobs", {
          description: data.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Failed to clear jobs", {
        description: "Could not connect to server",
      });
    }
  };

  const myJobs = jobs.filter(j => j.createdBy === clientId);

  const stats = {
    success: myJobs.filter(j => j.status === "SUCCESS").length,
    failed: myJobs.filter(j => j.status === "FAILED").length,
    pending: myJobs.filter(j => j.status === "PENDING").length,
    processing: myJobs.filter(j => j.status === "PROCESSING").length,
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster position="top-right" richColors />

      {isWakingUp && !connected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <Card className="w-full max-w-md border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                Waking Up Server...
              </CardTitle>
              <CardDescription className="text-base">
                The backend is starting up (Render free tier cold start)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated time:</span>
                  <span className="font-mono font-semibold">{countdown}s remaining</span>
                </div>
                <Progress value={(60 - countdown) / 60 * 100} className="h-2" />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p>
                  💡 <strong>Why this happens:</strong> Free tier services sleep after
                  15 minutes of inactivity. First request takes 30–60 seconds.
                </p>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Please wait... This only happens once!
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Real-Time Task Queue</h1>
            <p className="text-muted-foreground">
              Distributed processing with worker threads
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {!connected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Lost</AlertTitle>
            <AlertDescription>
              Unable to connect to the server. Real-time updates are disabled.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Job Builder</CardTitle>
            <CardDescription>
              Create custom jobs with configurable priority and workload intensity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JobBuilder onCreateJob={createJob} />
          </CardContent>
        </Card>

        <StatsBar {...stats} />

        <div>
          <h2 className="mb-4 text-xl font-semibold">Worker Pool</h2>
          <WorkerPool workers={workers} onRestart={restartWorker} />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Job Queue</h2>
            {myJobs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllJobs}
                className="text-muted-foreground hover:text-destructive hover:border-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
          <JobTable jobs={myJobs} onRetry={retryJob} />
        </div>
      </div>
    </div>
  );
}
