"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface JobBuilderProps {
    onCreateJob: (taskName: string, priority: string, intensity: number) => void;
}

export function JobBuilder({ onCreateJob }: JobBuilderProps) {
    const [open, setOpen] = useState(false);
    const [taskName, setTaskName] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [intensity, setIntensity] = useState([30]);

    const handleSubmit = () => {
        if (!taskName.trim()) {
            return;
        }

        onCreateJob(taskName, priority, intensity[0]);

        setTaskName("");
        setPriority("MEDIUM");
        setIntensity([30]);
        setOpen(false);
    };

    const getIntensityDescription = (value: number) => {
        if (value < 20) return "Very Light (~instant)";
        if (value < 35) return "Light (~1-2s)";
        if (value < 42) return "Moderate (~3-5s)";
        if (value < 45) return "Heavy (~8-10s)";
        return "Very Heavy (>10s)";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Create Job
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Job Builder</DialogTitle>
                    <DialogDescription>
                        Configure and submit a new job to the distributed queue
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="taskName">Task Name</Label>
                        <Input
                            id="taskName"
                            placeholder="e.g., Q3 Financial Report"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSubmit();
                                }
                            }}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger id="priority">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        Low Priority
                                    </div>
                                </SelectItem>
                                <SelectItem value="MEDIUM">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                        Medium Priority
                                    </div>
                                </SelectItem>
                                <SelectItem value="HIGH">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        High Priority
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="intensity">Workload Intensity</Label>
                            <span className="text-sm font-medium text-muted-foreground">
                                {intensity[0]}
                            </span>
                        </div>
                        <Slider
                            id="intensity"
                            min={0}
                            max={100}
                            step={1}
                            value={intensity}
                            onValueChange={setIntensity}
                            className="cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0 (Instant)</span>
                            <span className="text-foreground font-medium">
                                {getIntensityDescription(intensity[0])}
                            </span>
                            <span>100 (Extreme)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Calculates Fibonacci({intensity[0]}). Higher values increase CPU load exponentially.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!taskName.trim()}>
                        Submit Job
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
