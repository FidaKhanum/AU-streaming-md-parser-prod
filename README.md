# AU-streaming-md-parser-prod
# Streaming Markdown Parser

A robust, "optimistic" Markdown parser built to handle streaming text input (similar to ChatGPT or Claude). It styles markdown elements (like code blocks and headers) *immediately* as they are typed, rather than waiting for the closing tags.

## Features

* **Optimistic Parsing:** Instantly detects and styles inline code (\`) and code blocks (\`\`\`) before the closing tags arrive.
* **State Machine Logic:** Uses a custom state machine (`TEXT`, `INLINE`, `BLOCK`, `HEADER`) to handle complex parsing transitions token-by-token.
* **Solid Block Rendering:** Handles newline logic correctly to ensure code blocks remain continuous and solid, even when streaming line breaks.
* **Bonus Elements:** Supports **Bold** (`**text**`) and **Headers** (`#`, `##`, etc.) with correct styling.
* **DOM Stability:** Appends new tokens to the existing DOM structure to allow text selection and copying while streaming.

##  How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Build the Project:**
    ```bash
    npm run build
    ```
    *(Note: On Windows, use `npx tsc` if the build script fails)*

3.  **Run:**
    Open `dist/index.html` in your browser.

##  Technical Approach

The core logic resides in `src/MarkdownParser.ts`. It processes text chunks using a state-preserving loop:
* **State Persistence:** Global variables track the current state (e.g., inside a code block) across different stream chunks.
* **Buffering:** Special logic buffers characters like closing backticks to differentiate between a single backtick (inline code) and a triple backtick (code block closure).

