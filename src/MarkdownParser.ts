const blogpostMarkdown = `# control

*humans should focus on bigger problems*

## Setup

\`\`\`bash
git clone git@github.com:anysphere/control
\`\`\`

\`\`\`bash
./init.sh
\`\`\`

## Folder structure

**The most important folders are:**

1. \`vscode\`: this is our fork of vscode, as a submodule.
2. \`milvus\`: this is where our Rust server code lives.
3. \`schema\`: this is our Protobuf definitions for communication between the client and the server.

Each of the above folders should contain fairly comprehensive README files; please read them. If something is missing, or not working, please add it to the README!

Some less important folders:

1. \`release\`: this is a collection of scripts and guides for releasing various things.
2. \`infra\`: infrastructure definitions for the on-prem deployment.
3. \`third_party\`: where we keep our vendored third party dependencies.

## Miscellaneous things that may or may not be useful

##### Where to find rust-proto definitions

They are in a file called \`aiserver.v1.rs\`. It might not be clear where that file is. Run \`rg --files --no-ignore bazel-out | rg aiserver.v1.rs\` to find the file.

## Releasing

Within \`vscode/\`:

- Bump the version
- Then:

\`\`\`
git checkout build-todesktop
git merge main
git push origin build-todesktop
\`\`\`

- Wait for 14 minutes for gulp and ~30 minutes for todesktop
- Go to todesktop.com, test the build locally and hit release
`;

let currentContainer: HTMLElement | null = null; 

// --- PARSER STATE GLOBALS ---
type ParseState = 'TEXT' | 'INLINE' | 'BLOCK' | 'HEADER';
let state: ParseState = 'TEXT';
let currentSpan: HTMLElement | null = null;

// Trackers
let backtickSequence = 0; 
let isOpeningSequence = false; 
let blockCloseBuffer = ""; 
let isBold = false;        // Track bold state
let asteriskSequence = 0;  // Track **
let isLineStart = true;    // Track if we are at start of line (for headers)
let headerHashCount = 0;   // Track #, ##, ###

const injectStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .md-text { font-family: sans-serif; color: #333; white-space: pre-wrap; }
        .md-inline { 
            background-color: #eee; 
            color: #d14; 
            font-family: monospace; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        .md-block { 
            display: block; 
            background-color: #2d2d2d; 
            color: #f8f8f2; 
            font-family: monospace; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 10px 0;
            white-space: pre-wrap; 
        }
        .md-bold { font-weight: bold; }
        .md-header-1 { font-size: 2em; font-weight: bold; display: block; margin-top: 20px; }
        .md-header-2 { font-size: 1.5em; font-weight: bold; display: block; margin-top: 15px; }
        .md-header-3 { font-size: 1.25em; font-weight: bold; display: block; margin-top: 10px; }
    `;
    document.head.appendChild(style);
};
let stylesInjected = false;

function runStream() {
    currentContainer = document.getElementById('markdownContainer')!;
    if (!stylesInjected) {
        injectStyles();
        stylesInjected = true;
    }
    
    // Reset parser state
    state = 'TEXT';
    currentSpan = null;
    backtickSequence = 0;
    isOpeningSequence = false;
    blockCloseBuffer = "";
    isBold = false;
    asteriskSequence = 0;
    isLineStart = true;
    headerHashCount = 0;
    currentContainer.innerHTML = ''; 

    const tokens: string[] = [];
    let remainingMarkdown = blogpostMarkdown;
    while (remainingMarkdown.length > 0) {
        const tokenLength = Math.floor(Math.random() * 18) + 2;
        const token = remainingMarkdown.slice(0, tokenLength);
        tokens.push(token);
        remainingMarkdown = remainingMarkdown.slice(tokenLength);
    }

    const toCancel = setInterval(() => {
        const token = tokens.shift();
        if (token) {
            addToken(token);
        } else {
            clearInterval(toCancel);
        }
    }, 20);
}

function ensureSpan(className: string) {
    // If the class changed, or we don't have a span, make a new one
    // Also, if bold state changed, we need a new span
    const finalClass = isBold && className === 'md-text' ? className + ' md-bold' : className;

    if (!currentSpan || currentSpan.className !== finalClass) {
        const span = document.createElement('span');
        span.className = finalClass;
        currentContainer!.appendChild(span);
        currentSpan = span;
    }
}

function addToken(token: string) {
    if (!currentContainer) return;

    for (const char of token) {
        // Handle Newlines (Reset line-based flags)
        if (char === '\n') {
            // FIX: If we are in a BLOCK, keep the state as BLOCK!
            if (state === 'BLOCK') {
                currentSpan!.innerText += char;
            } else {
                state = 'TEXT'; 
                isLineStart = true;
                headerHashCount = 0;
                asteriskSequence = 0;
                backtickSequence = 0;
                ensureSpan('md-text');
                currentSpan!.innerText += char;
            }
            continue;
        }

        // --- STATE: NORMAL TEXT ---
        if (state === 'TEXT') {
            // Check for Code (` or ```)
            if (char === '`') {
                state = 'INLINE';
                ensureSpan('md-inline');
                backtickSequence = 1;
                isOpeningSequence = true;
            } 
            // Check for Bold (**)
            else if (char === '*') {
                asteriskSequence++;
                if (asteriskSequence === 2) {
                    isBold = !isBold; // Toggle Bold
                    asteriskSequence = 0;
                    // Force new span to apply/remove bold class
                    currentSpan = null; 
                    ensureSpan('md-text');
                }
            }
            // Check for Header Start (#)
            else if (char === '#' && isLineStart) {
                headerHashCount++;
            }
            // If we are accumulating #s and see a space, it's a Header
            else if (headerHashCount > 0 && char === ' ') {
                state = 'HEADER';
                // Map # count to CSS class (header-1, header-2, etc.)
                const hLevel = Math.min(headerHashCount, 3); 
                ensureSpan(`md-header-${hLevel}`);
                isLineStart = false; // Header started, no longer start of line logic
                headerHashCount = 0; // Reset counter
            }
            // If we were counting #s but hit text immediately (e.g. #tag), it's not a header
            else if (headerHashCount > 0) {
                // Not a header, print the hashes we swallowed
                ensureSpan('md-text');
                currentSpan!.innerText += '#'.repeat(headerHashCount) + char;
                headerHashCount = 0;
                isLineStart = false;
            }
            // Normal Character
            else {
                // If we had a single *, print it (it wasn't bold)
                if (asteriskSequence > 0) {
                    ensureSpan('md-text');
                    currentSpan!.innerText += '*';
                    asteriskSequence = 0;
                }
                
                ensureSpan('md-text');
                currentSpan!.innerText += char;
                isLineStart = false; 
            }
        }
        
        // --- STATE: HEADER (Stays in this state until newline) ---
        else if (state === 'HEADER') {
             currentSpan!.innerText += char;
        }

        // --- STATE: INLINE CODE ---
        else if (state === 'INLINE') {
            if (char === '`') {
                backtickSequence++;
                if (isOpeningSequence) {
                    if (backtickSequence === 3) {
                        state = 'BLOCK';
                        currentSpan!.className = 'md-block';
                    }
                } else {
                    state = 'TEXT';
                    ensureSpan('md-text');
                }
            } else {
                isOpeningSequence = false;
                backtickSequence = 0;
                currentSpan!.innerText += char;
            }
        }
        
        // --- STATE: CODE BLOCK ---
        else if (state === 'BLOCK') {
            if (char === '`') {
                blockCloseBuffer += char;
                if (blockCloseBuffer.length === 3) {
                    state = 'TEXT';
                    ensureSpan('md-text');
                    blockCloseBuffer = "";
                }
            } else {
                if (blockCloseBuffer.length > 0) {
                    currentSpan!.innerText += blockCloseBuffer;
                    blockCloseBuffer = "";
                }
                currentSpan!.innerText += char;
            }
        }
    }
}