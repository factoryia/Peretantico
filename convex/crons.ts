import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup queue items, locks, and processed events every hour
crons.interval(
  "queue-cleanup",
  { minutes: 60 },
  internal.queueWorkers.cleanupQueue
);

export default crons;
