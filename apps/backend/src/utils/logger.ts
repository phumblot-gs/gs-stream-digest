import pino from 'pino';
import { getAxiom, getDataset } from './axiom';

// Custom stream that sends logs to Axiom
const axiomStream = {
  write: async (log: string) => {
    try {
      const axiom = getAxiom();
      const dataset = getDataset();
      if (axiom && dataset) {
        const logData = JSON.parse(log);
        await axiom.ingest(dataset, [
          {
            _time: new Date().toISOString(),
            level: logData.level,
            msg: logData.msg,
            ...logData,
          },
        ]);
      }
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('[Logger] Failed to send log to Axiom:', error);
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