import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder and TextDecoder to the global scope for tests
Object.assign(global, { TextEncoder, TextDecoder });

// Add any global test utilities/helpers here
