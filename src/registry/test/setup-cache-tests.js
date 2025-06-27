import { vi, afterAll } from 'vitest';

// Setup mock global objects for testing
// This runs before the tests to provide necessary mocks

// Mock global web standard objects that are available in Cloudflare Workers
// but not in Node.js test environment

// Mock Request class if not available
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = (init?.method || 'GET').toUpperCase();
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
      this.json = async () => {
        if (typeof this.body === 'string') {
          return JSON.parse(this.body);
        } else if (this.body && typeof this.body.json === 'function') {
          return this.body.json();
        }
        return undefined;
      };
      this.text = async () => {
        if (typeof this.body === 'string') {
          return this.body;
        } else if (this.body && typeof this.body.text === 'function') {
          return this.body.text();
        }
        return '';
      };
      this.arrayBuffer = async () => new ArrayBuffer(0);
      this.formData = async () => new FormData();
      this.blob = async () => new Blob();
    }

    get path() {
      try {
        return new URL(this.url).pathname;
      } catch (e) {
        return this.url;
      }
    }
  };
}

// Mock Response class if not available
if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || '';
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.type = 'default';
      this.redirected = false;
      this.url = '';
      this._bodyUsed = false;
    }

    get bodyUsed() {
      return this._bodyUsed;
    }

    async arrayBuffer() {
      this._bodyUsed = true;
      if (this.body instanceof ArrayBuffer) return this.body;
      if (typeof this.body === 'string') {
        const encoder = new TextEncoder();
        return encoder.encode(this.body).buffer;
      }
      return new ArrayBuffer(0);
    }

    async text() {
      this._bodyUsed = true;
      if (typeof this.body === 'string') return this.body;
      if (this.body && typeof this.body.text === 'function') return this.body.text();
      if (this.body && typeof this.body === 'object') return JSON.stringify(this.body);
      return '';
    }

    async json() {
      this._bodyUsed = true;
      if (typeof this.body === 'string') return JSON.parse(this.body);
      if (this.body && typeof this.body.json === 'function') return this.body.json();
      if (this.body && typeof this.body === 'object') return this.body;
      return {};
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers)
      });
    }
  };
}

// Mock Headers class if not available
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => {
            this.append(key, value);
          });
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this.append(key, value);
          });
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.append(key, value);
          });
        }
      }
    }

    append(name, value) {
      name = name.toLowerCase();
      if (this._headers.has(name)) {
        this._headers.set(name, `${this._headers.get(name)}, ${value}`);
      } else {
        this._headers.set(name, value);
      }
    }

    delete(name) {
      this._headers.delete(name.toLowerCase());
    }

    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }

    has(name) {
      return this._headers.has(name.toLowerCase());
    }

    set(name, value) {
      this._headers.set(name.toLowerCase(), value);
    }

    forEach(callback) {
      this._headers.forEach((value, key) => {
        callback(value, key, this);
      });
    }
  };
}

// Mock TransformStream if not available
if (typeof TransformStream === 'undefined') {
  global.TransformStream = class TransformStream {
    constructor() {
      this.readable = {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
          cancel: async () => {}
        })
      };
      this.writable = {
        getWriter: () => ({
          write: async () => {},
          close: async () => {},
          abort: async () => {}
        })
      };
    }
  };
}

// Mock console to avoid noise in tests
const originalConsole = { ...console };
console.debug = vi.fn();
console.log = vi.fn();
console.info = vi.fn();
// Keep error and warn for debugging

// Clean up all mocks after tests are done
afterAll(() => {
  vi.restoreAllMocks();
  Object.assign(console, originalConsole);
});
