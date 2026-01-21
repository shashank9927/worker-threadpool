const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'MEDIUM'
    },
    intensity: {
        type: Number,
        min: 0,
        max: 100,
        default: 30
    },
    type: {
        type: String,
        default: 'CUSTOM'
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
        default: 'PENDING'
    },
    result: String,
    error: String,
    failedReason: {
        type: String,
        enum: ['TIMEOUT', 'ERROR', 'WORKER_RESTARTED'],
        default: null
    },
    createdBy: {
        type: String,
        required: true
    },
    workerId: Number,
    progress: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Job', JobSchema);
