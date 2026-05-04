/**
 * Type declarations for the @mariozechner/pi-coding-agent host API.
 * These describe the interface the host application provides to plugins.
 */

export interface ToolDefinition {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(
    toolCallId: string,
    params: Record<string, unknown>,
    signal: AbortSignal | undefined,
    onUpdate: ((details: unknown) => void) | undefined,
    ctx: ExtensionContext,
  ): Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

export interface BeforeAgentStartEvent {
  systemPrompt: string;
}

export interface AgentEndEvent {
  messages: Array<{ role: string; content: string }>;
}

export interface ToolExecutionEndEvent {
  toolName: string;
  params: Record<string, unknown>;
  result: unknown;
}

export interface ExtensionContext {
  cwd: string;
  ui: ExtensionUI;
}

export interface ExtensionUI {
  notify(message: string, type?: 'info' | 'warning' | 'error'): void;
}

export interface ExtensionAPI {
  registerTool(tool: ToolDefinition): void;
  registerCommand(name: string, handler: (ctx: ExtensionContext, ...args: string[]) => Promise<string> | string): void;
  onBeforeAgentStart(handler: (event: BeforeAgentStartEvent, ctx: ExtensionContext) => BeforeAgentStartEvent | Promise<BeforeAgentStartEvent>): void;
  onAgentEnd(handler: (event: AgentEndEvent, ctx: ExtensionContext) => void | Promise<void>): void;
  onToolExecutionEnd(handler: (event: ToolExecutionEndEvent, ctx: ExtensionContext) => void): void;
}
