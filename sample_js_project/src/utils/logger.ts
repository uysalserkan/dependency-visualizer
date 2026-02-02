// Logger utility
import config from '~/lib/config';

export const logger = {
  log: (message) => {
    if (config.debug) {
      console.log(`[LOG] ${message}`);
    }
  },
  error: (message) => {
    console.error(`[ERROR] ${message}`);
  },
};
