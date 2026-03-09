# AGENTS.md

Welcome to PathForge Agent Engine. This document provides essential information for AI coding agents working in this repository.

## 🛠 Build, Run, and Test Commands

This project uses **Bun** as its primary runtime and package manager.

- **Install Dependencies:** `bun install`
- **Run CLI App:** `bun run index.ts`
- **Run Specific File:** `bun <path_to_file>`
- **Run Tests:** `bun test` (No tests are currently implemented, but this is the standard for Bun)
- **Run Single Test:** `bun test <path_to_test_file>.test.ts`
- **Type Check:** `tsc --noEmit`

## 📂 Project Structure Overview

- `index.ts`: Main entry point for the CLI application. Handles arguments and user interaction loops.
- `src/api/`: Standardized interface (`ILLMClient`) and providers (OpenAI, Gemini, Anthropic).
- `src/core/`: Core agent logic.
    - `messageLoop.ts`: Orchestrates the dialogue, printing chunks in real-time and managing the agent's state.
    - `query.ts`: Wraps the client execution, providing a provider-agnostic way to execute completions.
- `src/tools/`: Tool/function definitions, logic, and management.
- `src/ui/`: React-based web UI components and state management (experimental).

## 📝 Code Style Guidelines

### 1. Imports and Formatting
- **Standard:** Use ES modules (`import`/`export`). 
- **Formatting:** 2-space indentation. Preserving existing code style is mandatory. Use trailing commas where appropriate in lists.
- **Type Imports:** Always use `import type` for TypeScript types to ensure clean builds and avoid circular dependencies.
- **Path Aliases:** (Currently not used, use relative paths from `src/`).

### 2. Naming Conventions
- **Classes:** Use `PascalCase` (e.g., `OpenAIProvider`, `ClientFactory`).
- **Interfaces:** Use `PascalCase`. Prefer prefixing core abstractions with `I` (e.g., `ILLMClient`) to distinguish them from data shapes.
- **Methods & Variables:** Use `camelCase` (e.g., `streamChatCompletion`, `apiKey`).
- **Files:** Use `camelCase` for source files (e.g., `clientFactory.ts`) and `PascalCase` for React components (e.g., `REPL.tsx`).

### 3. Type Definitions
- Prefer `interface` over `type` for object shapes unless union/intersection types are specifically required.
- Maintain high type safety. Avoid `any` where possible. If a third-party library's types are messy, use `unknown` and perform type narrowing.
- Document complex type properties if their purpose isn't immediately obvious from the name.

### 4. Error Handling
- Use structured error handling (`try-catch` blocks) especially in streaming loops and API calls.
- Throw descriptive errors when encountering unsupported states (e.g., `throw new Error(\`Unsupported provider: \${provider}\`)`).
- Ensure the user is notified of critical errors via the CLI (using `@clack/prompts` like `p.log.error`).
- Always handle stream interruptions gracefully to prevent the process from hanging.

### 5. API Interactions
- All LLM interactions must go through the `ClientFactory` and follow the `ILLMClient` interface.
- Streaming is preferred over blocking responses. Implementations should return `AsyncIterable<ChatCompletionChunk>`.
- Map provider-specific responses (like Gemini's `candidates`) to the standardized `ChatCompletionChunk` format in `src/api/types.ts`.

### 6. Environment Variables
- Manage secrets via a `.env` file using the `dotenv` package.
- Standard keys: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_MODEL`.
- Use `process.env` in the CLI and `import.meta.env` (Vite) in the UI code.

## 🤖 Tool Calling Pattern
The project includes a standardized `ToolCall` and `ToolDefinition` structure in `src/api/types.ts`.
- When implementing tool calls, buffer the arguments from the stream and parse them once the `finish_reason` is `tool_calls`.
- Keep tool logic decoupled from the LLM provider implementations. Logic for executing a tool should reside in `src/tools/`.
- The `messageLoop` should detect tool calls, execute them, append the result to messages, and re-trigger the completion if necessary.

## 💬 CLI User Interaction
- Use `@clack/prompts` for all terminal UI elements.
- `p.intro()` and `p.outro()` for session boundaries.
- `p.spinner()` for long-running operations like AI completions.
- `p.text()` and `p.select()` for user input.
- `process.stdout.write` for real-time streaming to the terminal.

## 🌐 Web UI (Experimental)
- The components in `src/ui/` are React-based and intended for a browser environment.
- Use `Vite` conventions for environment variables in the UI (e.g., `import.meta.env.VITE_...`).
- CLI logic and UI logic should share the same `src/api/` abstractions but manage state differently (CLI uses loops/local variables; UI uses `AIContext`).

## ⚠️ Safety Protocols
- **Secrets:** Never commit `.env` or hardcoded API keys.
- **File System:** Before using file system tools, construct absolute paths by combining the project root with the relative path.
- **Parallelism:** Run independent search/read operations in parallel to optimize context retrieval.
- **Confirmation:** Destructive actions or those with high side effects should require user confirmation via the CLI prompts.

---
*Follow these instructions strictly to ensure consistency across the PathForge codebase.*
