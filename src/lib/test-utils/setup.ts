import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Add any global test utilities/helpers here
