/**
 * Shared harness for executing AI agent tools with mocked Convex context.
 * Provides reusable builders and utilities to avoid test duplication.
 */

import { vi } from "vitest";

/**
 * Creates a minimal Convex query mock that returns service fields.
 */
export function createMockQuery<T extends { fields: unknown[] }>(fields: T["fields"]) {
  return vi.fn().mockResolvedValue({ fields });
}

/**
 * Creates a minimal Convex mutation mock.
 */
export function createMockMutation<T = unknown>(result?: T, shouldThrow = false) {
  return vi.fn().mockImplementation(async () => {
    if (shouldThrow) throw new Error("Mutation error");
    return result;
  });
}

/**
 * Creates a mock storage interface.
 */
export function createMockStorage(options?: { storeResult?: string; getUrlResult?: string }) {
  return {
    store: vi.fn().mockResolvedValue(options?.storeResult ?? "storage_mock"),
    getUrl: vi.fn().mockResolvedValue(options?.getUrlResult ?? "https://storage.local/mock"),
  };
}

/**
 * Creates a minimal Convex context for tool testing.
 */
export interface ToolTestContext {
  runQuery: ReturnType<typeof createMockQuery>;
  runMutation: ReturnType<typeof createMockMutation>;
  storage: ReturnType<typeof createMockStorage>;
}

/**
 * Factory for creating test contexts with common configurations.
 */
export function createToolTestContext(overrides?: Partial<ToolTestContext>): ToolTestContext {
  return {
    runQuery: createMockQuery([]),
    runMutation: createMockMutation({}),
    storage: createMockStorage(),
    ...overrides,
  };
}

/**
 * Executes a tool with the given context and arguments.
 * Standardizes the execution pattern for all AI agent tools.
 */
export async function invokeTool<TArgs>(
  tool: { execute: (args: unknown, options: unknown) => Promise<unknown> },
  ctx: ToolTestContext,
  args: TArgs
): Promise<unknown> {
  return tool.execute.call(
    { execute: tool.execute, ctx },
    args,
    { toolCallId: "test-call", messages: [] }
  );
}

/**
 * Builder for creating mock field definitions.
 */
export interface MockFieldBuilder {
  _id: string;
  name: string;
  type: "Select" | "Text" | "Boolean" | "File" | "Number" | "Date";
  required?: boolean;
  options?: unknown[];
  status?: boolean;
  withOptions(options: { label: string; value: string }[]): MockFieldBuilder;
  build(): {
    _id: string;
    name: string;
    type: string;
    required?: boolean;
    options?: unknown;
    status?: boolean;
  };
}

export function createMockField(
  id: string,
  name: string,
  type: MockFieldBuilder["type"]
): MockFieldBuilder {
  const field: MockFieldBuilder = {
    _id: id,
    name,
    type,
    required: false,
    status: true,
    options: [],

    withOptions(options) {
      this.options = options;
      return this;
    },

    build() {
      return {
        _id: this._id,
        name: this.name,
        type: this.type,
        required: this.required,
        options: this.options,
        status: this.status,
      };
    },
  };

  return field;
}

/**
 * Builder for creating mock service definitions.
 */
export interface MockServiceBuilder {
  _id: string;
  name: string;
  status: boolean;
  fields: unknown[];
  withPrice(price: number): MockServiceBuilder;
  withFields(fields: unknown[]): MockServiceBuilder;
  build(): {
    _id: string;
    name: string;
    status: boolean;
    price?: number;
    fields: unknown[];
  };
}

export function createMockService(id: string, name: string): MockServiceBuilder {
  const service: MockServiceBuilder = {
    _id: id,
    name,
    status: true,
    fields: [],

    withPrice(price) {
      (this as MockServiceBuilder & { price?: number }).price = price;
      return this;
    },

    withFields(fields) {
      this.fields = fields;
      return this;
    },

    build() {
      return {
        _id: this._id,
        name: this.name,
        status: this.status,
        fields: this.fields,
      };
    },
  };

  return service;
}
