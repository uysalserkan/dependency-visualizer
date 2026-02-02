// Main application entry point
import { Button } from './components/Button';
import { formatDate, calculateTotal } from './utils/helpers';
import config from '~/lib/config';

console.log('App started');
const total = calculateTotal([1, 2, 3]);
console.log(`Total: ${total}`);
