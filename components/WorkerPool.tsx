"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Cpu, RefreshCw } from "lucide-react";

interface Worker {
    id: number;
    status: 'IDLE' | 'BUSY';
    currentJobId?: string;
    progress?: number;
}

interface WorkerPoolProps {
    workers: Worker[];
    onRestart: (workerId: number) => void;
}

export function WorkerPool({ workers, onRestart }: WorkerPoolProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {workers.map((worker) => (
                <Card key={worker.id} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm font-medium">
                                    Worker {worker.id}
                                </CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={worker.status === 'BUSY' ? 'default' : 'outline'}
                                    className={
                                        worker.status === 'BUSY'
                                            ? 'bg-blue-500 hover:bg-blue-600'
                                            : 'bg-zinc-800 text-zinc-400'
                                    }
                                >
                                    {worker.status}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onRestart(worker.id)}
                                    className="h-7 w-7 p-0 cursor-pointer"
                                    title={`Restart Worker ${worker.id}`}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {worker.status === 'BUSY' ? (
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">
                                    Processing job...
                                </div>
                                <Progress
                                    value={worker.progress || 0}
                                    className="h-1.5 animate-pulse"
                                />
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">
                                Waiting for tasks
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
