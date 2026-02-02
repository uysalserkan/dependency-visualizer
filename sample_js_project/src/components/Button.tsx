// Button component
import React from 'react';
import { formatDate } from '../utils/helpers';
import { logger } from '@/utils/logger';

export function Button({ label, onClick }) {
  logger.log(`Button rendered: ${label}`);
  return <button onClick={onClick}>{label}</button>;
}
