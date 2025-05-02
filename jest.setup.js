// Global mocks for Next.js App Router API routes
global.Request = class Request {
  constructor(input, init) {
    this.url = input;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
    this.body = init?.body;
  }
  
  json() {
    return Promise.resolve(this.body ? JSON.parse(this.body) : {});
  }
};

global.Headers = class Headers {
  constructor(init) {
    this.headers = {};
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers[key.toLowerCase()] = value;
      });
    }
  }
  
  get(name) {
    return this.headers[name.toLowerCase()] || null;
  }
  
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Headers(init?.headers);
  }
  
  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
};

// Mock Next.js specific objects and functions
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => {
      if (name === 'auth-token') return { value: 'mock-token' };
      return null;
    }),
    set: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn((name) => {
      if (name === 'x-user-id') return '1';
      if (name === 'x-user-role') return 'admin';
      if (name === 'x-user-name') return 'admin';
      if (name === 'authorization') return 'Bearer mock-token';
      return null;
    }),
  })),
}));

jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      json: jest.fn((data, init) => {
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
          status: init?.status || 200,
        });
      }),
      redirect: jest.fn((url) => {
        return new Response(null, {
          headers: { Location: url },
          status: 302,
        });
      }),
      next: jest.fn(() => {
        return new Response(null, { status: 200 });
      }),
    },
  };
});

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000',
  JWT_SECRET: 'test-secret-key',
};

// Define mock feature flags
global.featureFlags = {
  textParser: {
    enabled: true,
    implementation: 'openai',
  },
  imageGeneration: true,
  summarization: true,
  platformConnectors: true,
  multiPlatformPublishing: true,
  notificationSystem: true,
  feedbackMechanism: true,
  airtableIntegration: true,
};