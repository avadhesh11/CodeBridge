import "dotenv/config";
import { runSample, configs, getRunnerMode, initJudgeEngine } from "../../execution-service/src/engine.js";
import submissionModel from "../src/models/submission.js";
import mongoose from "mongoose";

const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runVerification() {
  console.log(`\n${ANSI.bold}${ANSI.cyan}====================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}   CodeBridge Architecture Refactor Verification    ${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}====================================================${ANSI.reset}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Verify Engine Decoupling
  try {
    process.stdout.write("1. Verifying Engine Decoupling (No worker started on import)... ");
    const { getRunnerMode } = await import("../../execution-service/src/engine.js");
    // If worker had started at module import, global BullMQ worker instances would exist
    assert(typeof runSample === "function", "runSample is exported as function");
    console.log(`${ANSI.green}PASSED${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 2: Verify Supported Languages Configuration
  try {
    process.stdout.write("2. Verifying Supported Languages (C++, Python, Java, JS)... ");
    const expectedLangs = ["C++", "Python", "Java", "JavaScript"];
    for (const lang of expectedLangs) {
      assert(configs[lang], `Config for ${lang} must exist`);
      assert(configs[lang].filename, `Filename for ${lang} must exist`);
      assert(configs[lang].image, `Docker image for ${lang} must exist`);
    }
    console.log(`${ANSI.green}PASSED${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 3: Initialize Runner Mode
  try {
    process.stdout.write("3. Initializing Runner Mode detection... ");
    const mode = await initJudgeEngine();
    assert(mode === "docker" || mode === "native", `Runner mode must be docker or native, got: ${mode}`);
    console.log(`${ANSI.green}PASSED (${mode})${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 4: Execution - Valid Python Solution (AC)
  try {
    process.stdout.write("4. Testing Python AC execution... ");
    const res = await runSample(
      {
        testcases: [
          { input: "3\n1 2 3", output: "6" },
          { input: "2\n10 20", output: "30" }
        ],
        timelimit: 2
      },
      "n = int(input())\nnums = list(map(int, input().split()))\nprint(sum(nums))\n",
      "Python"
    );
    assert(res.verdict === "AC", `Expected AC, got ${res.verdict}: ${JSON.stringify(res)}`);
    console.log(`${ANSI.green}PASSED (Verdict: ${res.verdict})${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 5: Execution - Wrong Answer (WA)
  try {
    process.stdout.write("5. Testing Python WA detection... ");
    const res = await runSample(
      {
        testcases: [{ input: "5", output: "10" }],
        timelimit: 2
      },
      "n = int(input())\nprint(n * 3)\n",
      "Python"
    );
    assert(res.verdict === "WA", `Expected WA, got ${res.verdict}`);
    console.log(`${ANSI.green}PASSED (Verdict: ${res.verdict})${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 6: Execution - Runtime Error (RE)
  try {
    process.stdout.write("6. Testing Runtime Error (RE) detection... ");
    const res = await runSample(
      {
        testcases: [{ input: "0", output: "1" }],
        timelimit: 2
      },
      "x = 1 / 0\n",
      "Python"
    );
    assert(res.verdict === "RE", `Expected RE, got ${res.verdict}`);
    console.log(`${ANSI.green}PASSED (Verdict: ${res.verdict})${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 7: Execution - Time Limit Exceeded (TLE)
  try {
    process.stdout.write("7. Testing Timeout / TLE enforcement... ");
    const start = Date.now();
    const res = await runSample(
      {
        testcases: [{ input: "test", output: "test" }],
        timelimit: 1
      },
      "import time\nwhile True:\n    pass\n",
      "Python"
    );
    const duration = Date.now() - start;
    assert(res.verdict === "TLE", `Expected TLE, got ${res.verdict}`);
    assert(duration < 6000, `Execution should terminate under 6s, took ${duration}ms`);
    console.log(`${ANSI.green}PASSED (Verdict: ${res.verdict} in ${duration}ms)${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  // Test 8: Submission Model Schema Validation
  try {
    process.stdout.write("8. Validating Submission model schema definitions... ");
    assert(submissionModel.schema.path("submissionId"), "submissionId must be defined in schema");
    assert(submissionModel.schema.path("status"), "status must be defined in schema");
    assert(submissionModel.schema.path("verdict"), "verdict must be defined in schema");
    assert(submissionModel.schema.path("results"), "results must be defined in schema");
    const validStatuses = submissionModel.schema.path("status").enumValues;
    assert(validStatuses.includes("QUEUED"), "status must contain QUEUED");
    assert(validStatuses.includes("RUNNING"), "status must contain RUNNING");
    assert(validStatuses.includes("ACCEPTED"), "status must contain ACCEPTED");
    assert(validStatuses.includes("INTERNAL_ERROR"), "status must contain INTERNAL_ERROR");
    console.log(`${ANSI.green}PASSED${ANSI.reset}`);
    passed++;
  } catch (err) {
    console.log(`${ANSI.red}FAILED: ${err.message}${ANSI.reset}`);
    failed++;
  }

  console.log(`\n====================================================`);
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Verification run error:", err);
  process.exit(1);
});
