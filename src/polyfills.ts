import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: any;
  }
}

window.Buffer = window.Buffer || Buffer;
window.process = window.process || { env: {} };
