// queues/scrapeQueue.ts
import { Queue } from "bullmq";

export const scrapeQueue = new Queue("scrapeQueue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});