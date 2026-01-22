const { parentPort } = require('worker_threads');

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

parentPort.on('message', (job) => {
    try {
        const intensity = job.intensity || 30;
        const steps = 4;

        for (let i = 1; i <= steps; i++) {
            const subIntensity = Math.floor(intensity / steps);
            fibonacci(subIntensity + 15);

            parentPort.postMessage({
                type: 'progress',
                jobId: job._id,
                progress: Math.round((i / steps) * 100)
            });
        }

        const finalResult = fibonacci(intensity);

        parentPort.postMessage({
            type: 'complete',
            jobId: job._id,
            result: `Fibonacci(${intensity}) = ${finalResult}`
        });
    } catch (error) {
        parentPort.postMessage({
            type: 'error',
            jobId: job._id,
            error: error.message
        });
    }
});
