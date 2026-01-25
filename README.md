# Real Time Worker Queue

Concurrent processing with worker threads and priority scheduling

A task queue system with real-time job monitoring. Built using Node.js Worker Threads for concurrent execution and Socket.io for live updates.

## Overview

This application demonstrates a distributed task processing system where jobs are submitted to a priority queue and executed by a pool of worker threads. The system provides real-time visibility into job status, worker health, and processing metrics through a responsive web interface.

## Core Features

- **Priority-based queue management** - Jobs are sorted by priority level (HIGH, MEDIUM, LOW) and processed using FIFO within each priority tier
- **Concurrent job processing** - Two worker threads handle jobs simultaneously, enabling parallel execution
- **Real-time updates** - Socket.io provides instant notifications of job progress, status changes, and worker events
- **Worker pool monitoring** - Live visibility into worker thread status with manual restart capability
- **Watchdog timers** - Automatic detection and termination of frozen jobs after 75 seconds
- **Automatic recovery** - Workers are automatically restarted after crashes or timeouts
- **Cold start handling** - Smart loading states for free-tier deployments that sleep after inactivity

## Technology Stack

**Frontend**  
Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI, Socket.IO-client

**Backend**  
Node.js, Express, Socket.IO, Worker Threads, Mongoose

**Infrastructure**  
MongoDB Atlas (database), Vercel (frontend hosting), Render (backend hosting), Docker

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB connection string (Atlas or local instance)
- npm or yarn package manager

### Local Development

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd task-queue
npm install
cd server && npm install && cd ..
```

2. Configure environment variables:

Frontend (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Backend (`server/.env`):
```
MONGO_URI=<your-mongodb-connection-string>
PORT=5000
FRONTEND_URL=http://localhost:3000
```

3. Start the backend server:

```bash
cd server
npm start
```

4. In a new terminal, start the frontend:

```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

### Docker Deployment

```bash
docker-compose up
```

Access the application at `http://localhost:3000`

## Project Structure

```
task-queue/
├── app/                    # Next.js application
│   └── page.tsx           # Main dashboard component
├── components/            # React components
│   ├── JobBuilder.tsx    # Job creation interface
│   ├── JobTable.tsx      # Job list and detail view
│   ├── StatsBar.tsx      # Statistics visualization
│   └── WorkerPool.tsx    # Worker status display
├── server/               # Express backend
│   ├── models/Job.js     # Mongoose job schema
│   ├── worker.js         # Worker thread implementation
│   └── server.js         # Main server and queue logic
└── docker-compose.yml    # Container orchestration
```

## System Architecture

The application follows a client-server architecture with the following workflow:

1. User submits a job through the web interface (task name, priority, computational intensity)
2. Job is persisted to MongoDB and added to the priority queue
3. An idle worker thread picks up the highest-priority pending job
4. Worker executes the task (Fibonacci calculation) and reports progress
5. Socket.io broadcasts real-time updates to all connected clients
6. Upon completion, the job status is updated and the worker returns to the idle pool

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Retrieve all jobs, optionally filtered by clientId |
| POST | `/api/jobs` | Create a new job |
| POST | `/api/jobs/:id/retry` | Requeue a failed job |
| GET | `/api/workers` | Get current worker pool status |
| POST | `/api/workers/:id/restart` | Manually restart a worker thread |
| DELETE | `/api/jobs` | Clear all jobs (requires clearAll=true parameter) |

### Socket.io Events

**Server to Client:**
- `job:created` - Emitted when a new job is added to the queue
- `job:updated` - Emitted when job status changes
- `job:progress` - Emitted during job execution with progress percentage
- `worker:status` - Emitted when worker state changes (IDLE/BUSY)
- `worker:restarted` - Emitted after worker recovery
- `system-alert` - Emitted when watchdog timer terminates a frozen job

## Deployment

Detailed deployment instructions are available in [DEPLOYMENT.md](./DEPLOYMENT.md).

The application is configured for deployment on:
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

## Testing

To verify the system is working correctly:

1. Create a job with intensity level 40 (approximately 8-10 seconds processing time)
2. Observe real-time progress updates in the dashboard
3. Create multiple jobs with different priority levels
4. Verify that HIGH priority jobs are processed before MEDIUM and LOW priority jobs
5. Test worker restart functionality while a job is processing
6. Use the "Clear All" button to reset the job queue

## License

MIT

---

