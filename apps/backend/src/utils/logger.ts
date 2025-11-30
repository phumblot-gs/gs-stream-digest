import pino from 'pino';
import { getAxiom, getDataset } from './axiom';

// Queue for logs to be sent to Axiom
let logQueue: any[] = [];
let isFlushing = false;
let flushInterval: NodeJS.Timeout | null = null;

// Function to flush logs to Axiom
async function flushLogsToAxiom() {
  if (isFlushing || logQueue.length === 0) return;
  
  isFlushing = true;
  const axiom = getAxiom();
  const dataset = getDataset();
  
  if (!axiom || !dataset) {
    // Clear queue if Axiom is not available
    logQueue = [];
    isFlushing = false;
    return;
  }

  try {
    const logsToSend = [...logQueue];
    logQueue = [];
    
    if (logsToSend.length > 0) {
      await axiom.ingest(dataset, logsToSend);
      console.log(`[Logger] Sent ${logsToSend.length} logs to Axiom (${dataset})`);
    }
  } catch (error) {
    console.error('[Logger] Failed to send logs to Axiom:', error);
    // Put logs back in queue for retry (limit queue size)
    if (logQueue.length < 100) {
      logQueue.unshift(...logsToSend.slice(-10)); // Keep last 10 logs
    }
  } finally {
    isFlushing = false;
  }
}

// Start periodic flush (every 5 seconds)
function startFlushInterval() {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    flushLogsToAxiom().catch(console.error);
  }, 5000);
}

// Custom stream that queues logs for Axiom
const axiomStream = {
  write: (log: string) => {
    try {
      const logData = JSON.parse(log);
      const axiom = getAxiom();
      const dataset = getDataset();
      
      if (axiom && dataset) {
        // Add to queue
        logQueue.push({
          _time: new Date().toISOString(),
          level: logData.level,
          msg: logData.msg,
          ...logData,
        });
        
        // Start flush interval if not already started
        startFlushInterval();
        
        // Flush immediately if queue is getting large
        if (logQueue.length >= 10) {
          flushLogsToAxiom().catch(console.error);
        }
      }
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('[Logger] Failed to queue log for Axiom:', error);
    }
  },
};

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.multistream([
    // Console output with pretty formatting in development
    ...(process.env.NODE_ENV === 'development'
      ? [
          {
            level: 'info',
            stream: pino.transport({
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            }),
          },
        ]
      : [
          {
            level: 'info',
            stream: process.stdout,
          },
        ]),
    // Axiom stream for all environments
    {
      level: 'info',
      stream: axiomStream,
    },
  ])
);

// Export function to manually flush logs (useful for shutdown)
export async function flushAxiomLogs() {
  await flushLogsToAxiom();
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}
