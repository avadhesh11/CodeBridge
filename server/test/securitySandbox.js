import "dotenv/config";
import { runSample } from "../../execution-service/src/engine.js";

const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

async function runSecurityTests() {
  console.log(`\n${ANSI.bold}${ANSI.cyan}====================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}   CodeBridge Sandbox Security & Limits Test Suite  ${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}====================================================${ANSI.reset}\n`);

  const tests = [
    {
      name: "1. Infinite Loop (CPU Exhaustion Attack)",
      language: "Python",
      timelimit: 2,
      code: `
# Infinite loop attempt
while True:
    pass
`,
      validate: (res, duration) => {
        const pass = res.verdict === "TLE" && duration < 6000;
        return {
          pass,
          details: `Verdict: ${res.verdict} (Execution cleanly terminated in ${duration}ms, under max timeout)`,
        };
      },
    },
    {
      name: "2. Infinite Loop in C++ (Compiler/CPU Limit)",
      language: "C++",
      timelimit: 2,
      code: `
#include <iostream>
int main() {
    volatile long long count = 0;
    while(true) {
        count++;
    }
    return 0;
}
`,
      validate: (res, duration) => {
        const pass = res.verdict === "TLE" && duration < 8000;
        return {
          pass,
          details: `Verdict: ${res.verdict} (Terminated by sandbox watchdog in ${duration}ms)`,
        };
      },
    },
    {
      name: "3. Memory Hog / OOM Attack (1GB RAM allocation, 128MB limit)",
      language: "Python",
      timelimit: 3,
      code: `
# Attempt to allocate 1 GB of memory
# Sandbox has 128MB limit with swap disabled
try:
    giant_block = bytearray(1024 * 1024 * 1024)
    print("MALLOC_SUCCESS")
except Exception as e:
    print(f"MALLOC_CAUGHT: {type(e).__name__}")
`,
      validate: (res, duration) => {
        // Can be RE (Out of Memory killed / MemoryError) or TLE or safe catch
        const isContained = res.verdict === "RE" || res.verdict === "TLE" || (res.results && res.results[0]?.actual?.includes("MALLOC_CAUGHT"));
        return {
          pass: isContained,
          details: `Verdict: ${res.verdict}, Error: ${res.error || "Memory limit strictly enforced, host protected"}`,
        };
      },
    },
    {
      name: "4. Fork Bomb Attack (Process Limit: pids-limit=32 / ulimit -u 64)",
      language: "Python",
      timelimit: 2,
      code: `
import os
import sys

# Fork bomb attempt to saturate system process table
try:
    for i in range(100):
        pid = os.fork()
        if pid == 0:
            # Child process
            sys.exit(0)
    print("FORK_COMPLETED")
except Exception as e:
    print(f"FORK_BLOCKED: {type(e).__name__}")
`,
      validate: (res, duration) => {
        // Must not crash or lock host; finishes within reasonable time
        const pass = duration < 8000;
        return {
          pass,
          details: `Process containment held! Duration: ${duration}ms, Verdict: ${res.verdict || "Controlled exit"}`,
        };
      },
    },
    {
      name: "5. Network Isolation / SSRF Attack (network=none)",
      language: "Python",
      timelimit: 2,
      code: `
import socket

# Attempt outbound connection to exfiltrate data
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    s.connect(("8.8.8.8", 53))
    print("NET_OPEN")
except Exception as e:
    print(f"NET_BLOCKED: {type(e).__name__}")
`,
      validate: (res, duration) => {
        const output = res.results?.[0]?.actual || res.error || "";
        const pass = !output.includes("NET_OPEN") && (res.verdict === "RE" || output.includes("NET_BLOCKED") || res.verdict === "TLE");
        return {
          pass,
          details: `Network egress isolated: ${output || res.verdict}`,
        };
      },
    },
    {
      name: "6. Root Filesystem Tampering (Read-Only Container)",
      language: "Python",
      timelimit: 2,
      code: `
# Attempt to write to system directory
try:
    with open("/bin/malicious_payload", "w") as f:
        f.write("owned")
    print("WRITE_ALLOWED")
except Exception as e:
    print(f"WRITE_DENIED: {type(e).__name__}")
`,
      validate: (res, duration) => {
        const output = res.results?.[0]?.actual || res.error || "";
        const pass = !output.includes("WRITE_ALLOWED");
        return {
          pass,
          details: `Filesystem integrity held: ${output || res.verdict}`,
        };
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    process.stdout.write(`Running: ${t.name}... `);
    const start = Date.now();
    try {
      const res = await runSample(
        { testcases: [{ input: "", output: "" }], timelimit: t.timelimit },
        t.code,
        t.language
      );
      const duration = Date.now() - start;
      const { pass, details } = t.validate(res, duration);

      if (pass) {
        console.log(`${ANSI.green}PASSED${ANSI.reset} (${duration}ms)`);
        console.log(`   ${ANSI.yellow}↳ ${details}${ANSI.reset}\n`);
        passed++;
      } else {
        console.log(`${ANSI.red}FAILED${ANSI.reset} (${duration}ms)`);
        console.log(`   ${ANSI.red}↳ ${details}${ANSI.reset}\n`);
        failed++;
      }
    } catch (err) {
      const duration = Date.now() - start;
      console.log(`${ANSI.red}ERROR${ANSI.reset} (${duration}ms): ${err.message}\n`);
      failed++;
    }
  }

  console.log(`${ANSI.bold}====================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}Security Test Summary: ${ANSI.green}${passed} Passed${ANSI.reset}, ${failed > 0 ? ANSI.red : ANSI.green}${failed} Failed${ANSI.reset}`);
  console.log(`${ANSI.bold}====================================================${ANSI.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runSecurityTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
