import "dotenv/config";
import { runJudge, initJudgeEngine, configs } from "./src/engine.js";

async function runTests() {
  console.log("Testing Execution Service Engine...");
  const mode = await initJudgeEngine();
  console.log(`Runner mode: ${mode}`);

  console.log("1. Testing Python AC...");
  const acRes = await runJudge(
    [{ input: "3\n1 2 3", output: "6" }],
    "n = int(input())\nnums = list(map(int, input().split()))\nprint(sum(nums))\n",
    "Python"
  );
  console.log("Result:", acRes.verdict);
  if (acRes.verdict !== "AC") throw new Error("Expected AC");

  console.log("2. Testing Python WA...");
  const waRes = await runJudge(
    [{ input: "5", output: "10" }],
    "print(99)\n",
    "Python"
  );
  console.log("Result:", waRes.verdict);
  if (waRes.verdict !== "WA") throw new Error("Expected WA");

  console.log("3. Testing Python RE...");
  const reRes = await runJudge(
    [{ input: "", output: "" }],
    "x = 1 / 0\n",
    "Python"
  );
  console.log("Result:", reRes.verdict);
  if (reRes.verdict !== "RE") throw new Error("Expected RE");

  console.log("✅ All engine tests passed!");
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
