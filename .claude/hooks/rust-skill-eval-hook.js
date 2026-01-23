#!/usr/bin/env node
// Rust Skills Meta-Cognition Hook (Cross-platform)
// Forces Claude to use meta-cognition routing with mandatory tracing

const fs = require('fs');
const path = require('path');

// Check if current directory is a Rust project
function isRustProject() {
  const cwd = process.cwd();

  // Check for Cargo.toml in current directory or parent directories (up to 5 levels)
  let dir = cwd;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
      return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }

  // Check for .rs files in current directory
  try {
    const files = fs.readdirSync(cwd);
    if (files.some(f => f.endsWith('.rs'))) {
      return true;
    }
  } catch (e) {
    // ignore read errors
  }

  return false;
}

// Only output if this is a Rust project
if (!isRustProject()) {
  process.exit(0);
}

const output = `
=== RUST SKILLS DISPLAY FORMAT ===
When showing Rust Skills loaded, display in this EXACT order:
1. FIRST: "🦀 Rust Skills Loaded" text
2. THEN: The Ferris crab ASCII art BELOW the text
The text must be ABOVE the crab, not below.
===

=== MANDATORY: META-COGNITION ROUTING ===

CRITICAL: You MUST follow the COMPLETE meta-cognition framework.
Partial compliance (only loading L1 skill) is NOT acceptable.

## STEP 1: IDENTIFY ENTRY LAYER + DOMAIN

### Layer 1 Signals (Start here, trace UP):
- Error codes: E0382, E0597, E0277, E0499, etc.
- Keywords: cannot be sent, moved value, borrowed, lifetime

### Layer 3 Domain Signals (MUST also load domain skill):

| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, REST, axum, actix, handler, router | domain-web |
| payment, trading, fintech, decimal, currency | domain-fintech |
| CLI, command line, clap, terminal | domain-cli |
| embedded, no_std, MCU, firmware | domain-embedded |
| kubernetes, docker, grpc, microservice | domain-cloud-native |
| MQTT, sensor, IoT, telemetry | domain-iot |
| tensor, model, inference, ML | domain-ml |

**CRITICAL**: If domain keywords are present, you MUST load BOTH:
1. The Layer 1 skill (e.g., m07-concurrency)
2. The Layer 3 domain skill (e.g., domain-web)

## STEP 2: EXECUTE TRACING (MANDATORY)

For Layer 1 entry with domain context:

\`\`\`
L1 Error (e.g., Rc not Send)
    ^ TRACE UP: Why this design constraint?
    ^ Load domain skill (e.g., domain-web)
    ^ Find domain constraint (e.g., "handlers run on any thread")
    v TRACE DOWN: What pattern satisfies constraint?
    v Return to L1 with context-aware solution
\`\`\`

## STEP 3: MANDATORY OUTPUT FORMAT

Your response MUST include ALL of these sections:

### Reasoning Chain
\`\`\`
+-- Layer 1: [specific error]
|   Problem: [error description]
|       ^
+-- Layer 3: [domain name] (domain-xxx)
|   Constraint: [what is the domain constraint]
|   Rule: [why this constraint exists]
|       v
+-- Layer 2: Design Choice
    Decision: [design decision based on domain constraint]
\`\`\`

### Domain Constraints Analysis
- MUST reference specific rules from domain-xxx skill
- Explain WHY this domain has this constraint

### Recommended Solution
- Provide solution that follows domain best practices
- Not just fixing the compile error

## EXAMPLE: Web API + Send Error

Question: "Web API config sharing error: Rc cannot be sent"

CORRECT Response:
\`\`\`
### Reasoning Chain
+-- Layer 1: Send/Sync Error
|   Problem: Rc<T> cannot be sent between threads
|       ^
+-- Layer 3: Web Domain (domain-web)
|   Constraint: Handlers run on any thread
|   Rule: Shared state must be thread-safe
|       v
+-- Layer 2: Design Choice
    Decision: Use Arc<T> + State extractor

### Domain Constraints Analysis
From domain-web:
- "Rc in state" is a Common Mistake
- Web handlers require Send + Sync
- Recommended: axum State<Arc<T>> pattern

### Recommended Solution
[Code following Web best practices]
\`\`\`

WRONG Response (stops at L1):
\`\`\`
Problem: Rc is not Send
Solution: Use Arc
\`\`\`

## SKILLS TO INVOKE

Always invoke with Skill() tool:
- Skill(rust-router) - First, to get routing
- Skill(m0x-xxx) - Layer 1 skill based on error
- Skill(domain-xxx) - Layer 3 skill based on domain keywords

===================================
`;

console.log(output);
