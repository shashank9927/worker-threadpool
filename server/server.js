require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { Worker } = require('worker_threads');
const path = require('path');
const Job = require('./models/Job');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

const WORKER_COUNT = 2;
const workers = [];
const workerStatus = new Array(WORKER_COUNT).fill('IDLE');

const WATCHDOG_TIMEOUT_MS = 75000;
const jobTimeouts = new Map();

function createWorker(workerId) {
    const worker = new Worker(path.join(__dirname, 'worker.js'));

    worker.on('message', async (message) => {
        const { type, jobId, result, error, progress } = message;

        try {
            if (type === 'progress') {
                await Job.findByIdAndUpdate(jobId, { progress });
                const job = await Job.findById(jobId);
                io.emit('job:progress', { jobId, progress, workerId });
            } else if (type === 'complete') {
                if (jobTimeouts.has(jobId)) {
                    clearTimeout(jobTimeouts.get(jobId));
                    jobTimeouts.delete(jobId);
                }

                workerStatus[workerId] = 'IDLE';

                const job = await Job.findByIdAndUpdate(
                    jobId,
                    { status: 'SUCCESS', result, progress: 100, workerId },
                    { new: true }
                );

                io.emit('job:updated', job);
                io.emit('worker:status', { workerId, status: 'IDLE' });

                processQueue();
            } else if (type === 'error') {
                if (jobTimeouts.has(jobId)) {
                    clearTimeout(jobTimeouts.get(jobId));
                    jobTimeouts.delete(jobId);
                }

                workerStatus[workerId] = 'IDLE';

                const job = await Job.findByIdAndUpdate(
                    jobId,
                    { status: 'FAILED', error, failedReason: 'ERROR', workerId },
                    { new: true }
                );

                io.emit('job:updated', job);
                io.emit('worker:status', { workerId, status: 'IDLE' });

                processQueue();
            }
        } catch (err) {
            console.error('Error handling worker message:', err);
        }
    });

    worker.on('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        workerStatus[workerId] = 'IDLE';
        processQueue();
    });

    return worker;
}

for (let i = 0; i < WORKER_COUNT; i++) {
    workers.push(createWorker(i));
}

async function handleJobTimeout(jobId, workerId) {
    try {
        jobTimeouts.delete(jobId);

        const job = await Job.findByIdAndUpdate(
            jobId,
            {
                status: 'FAILED',
                error: 'Execution Timed Out (Watchdog Kill)',
                failedReason: 'TIMEOUT',
                workerId
            },
            { new: true }
        );

        if (job) {
            io.emit('job:updated', job);
        }

        await workers[workerId].terminate();

        workers[workerId] = createWorker(workerId);
        workerStatus[workerId] = 'IDLE';

        io.emit('system-alert', {
            message: `Worker ${workerId} timed out after 75 seconds. This is an intentional feature to prevent frozen jobs from blocking the queue.`,
            workerId
        });

        io.emit('worker:status', { workerId, status: 'IDLE' });

        processQueue();
    } catch (error) {
        console.error(`Error handling timeout for job ${jobId}:`, error);
    }
}

async function restartWorker(workerId) {
    try {
        const currentJob = await Job.findOne({
            workerId,
            status: 'PROCESSING'
        });

        if (currentJob) {
            currentJob.status = 'FAILED';
            currentJob.error = 'Worker was forcefully restarted';
            currentJob.failedReason = 'WORKER_RESTARTED';
            await currentJob.save();
            io.emit('job:updated', currentJob);
        }

        await workers[workerId].terminate();

        workers[workerId] = createWorker(workerId);
        workerStatus[workerId] = 'IDLE';

        io.emit('worker:status', { workerId, status: 'IDLE' });
        io.emit('worker:restarted', { workerId });

        processQueue();

        return true;
    } catch (error) {
        console.error(`Error restarting worker ${workerId}:`, error);
        return false;
    }
}

async function processQueue() {
    try {
        const idleWorkerIndex = workerStatus.findIndex(status => status === 'IDLE');
        if (idleWorkerIndex === -1) return;

        const pendingJobs = await Job.find({ status: 'PENDING' }).sort({ createdAt: 1 });
        if (pendingJobs.length === 0) return;

        const priorityWeights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        pendingJobs.sort((a, b) => {
            const diff = priorityWeights[b.priority] - priorityWeights[a.priority];
            if (diff !== 0) return diff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const job = pendingJobs[0];

        job.status = 'PROCESSING';
        job.workerId = idleWorkerIndex;
        job.progress = 0;
        await job.save();

        workerStatus[idleWorkerIndex] = 'BUSY';

        io.emit('job:updated', job);
        io.emit('worker:status', {
            workerId: idleWorkerIndex,
            status: 'BUSY',
            currentJobId: job._id
        });

        workers[idleWorkerIndex].postMessage({
            _id: job._id.toString(),
            intensity: job.intensity || 30
        });

        const timeoutId = setTimeout(() => {
            handleJobTimeout(job._id.toString(), idleWorkerIndex);
        }, WATCHDOG_TIMEOUT_MS);

        jobTimeouts.set(job._id.toString(), timeoutId);
    } catch (error) {
        console.error('Error processing queue:', error);
    }
}

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        processQueue();
    })
    .catch((error) => {
        console.error(error.message);
    });

app.get('/api/jobs', async (req, res) => {
    try {
        const { clientId } = req.query;
        const filter = clientId ? { createdBy: clientId } : {};
        const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/jobs', async (req, res) => {
    try {
        const { taskName, priority, intensity, type, createdBy } = req.body;

        if (!createdBy) {
            return res.status(400).json({ error: 'createdBy is required' });
        }

        if (type === 'CUSTOM' && !taskName) {
            return res.status(400).json({ error: 'taskName is required for custom jobs' });
        }

        const jobData = {
            taskName: taskName || `${type} Task`,
            priority: priority || 'MEDIUM',
            intensity: intensity || 30,
            type: type || 'CUSTOM',
            createdBy
        };

        const job = await Job.create(jobData);
        io.emit('job:created', job);

        processQueue();

        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/jobs/:id/retry', async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(
            req.params.id,
            {
                status: 'PENDING',
                error: null,
                result: null,
                progress: 0,
                workerId: null
            },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        io.emit('job:updated', job);
        processQueue();

        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/workers', async (req, res) => {
    try {
        const status = workerStatus.map((status, index) => ({
            id: index,
            status
        }));
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/jobs', async (req, res) => {
    try {
        const { clientId, clearAll } = req.query;

        const filter = clearAll === 'true'
            ? {}
            : clientId
                ? { createdBy: clientId }
                : {};

        if (clearAll !== 'true' && !clientId) {
            return res.status(400).json({ error: 'clientId or clearAll parameter is required' });
        }

        const result = await Job.deleteMany(filter);

        res.json({
            message: `Deleted ${result.deletedCount} jobs`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/workers/:id/restart', async (req, res) => {
    try {
        const workerId = parseInt(req.params.id);

        if (isNaN(workerId) || workerId < 0 || workerId >= WORKER_COUNT) {
            return res.status(400).json({ error: 'Invalid worker ID' });
        }

        const success = await restartWorker(workerId);

        if (success) {
            res.json({
                message: `Worker ${workerId} restarted successfully`,
                workerId,
                status: 'IDLE'
            });
        } else {
            res.status(500).json({ error: 'Failed to restart worker' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

io.on('connection', (socket) => {
    workerStatus.forEach((status, index) => {
        socket.emit('worker:status', { workerId: index, status });
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
