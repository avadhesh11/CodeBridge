import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { spawn } from "child_process";

const isWindows = process.platform === "win32";

export const configs = {
  "C++": {
    filename: "main.cpp",
    image: "frolvlad/alpine-gxx:latest",
    compileCmd: "g++ -O2 main.cpp -o main",
    runCmd: "./main",
    nativeCompileCmd: isWindows ? "g++ -O2 main.cpp -o main.exe" : "g++ -O2 main.cpp -o main",
    nativeRunCmd: isWindows ? ".\\main.exe" : "./main"
  },
  "Python": {
    filename: "main.py",
    image: "python:3.9-slim",
    compileCmd: null,
    runCmd: "python -B main.py",
    nativeCompileCmd: null,
    nativeRunCmd: isWindows ? "python -B main.py" : "python3 -B main.py"
  },
  "Java": {
    filename: "Main.java",
    image: "openjdk:17-jdk-slim",
    compileCmd: "javac Main.java",
    runCmd: "java -client Main",
    nativeCompileCmd: "javac Main.java",
    nativeRunCmd: "java -client Main"
  },
  "JavaScript": {
    filename: "main.js",
    image: "node:18-slim",
    compileCmd: null,
    runCmd: "node main.js",
    nativeCompileCmd: null,
    nativeRunCmd: "node main.js"
  }
};

const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB output bound

export const toDockerPath = (p) => {
  return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
};

let runnerMode = null; // "docker" | "native"

export const isDockerAvailable = async () => {
  return new Promise((resolve) => {
    const proc = spawn("docker", ["info"]);
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      resolve(false);
    }, 5000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });

    proc.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
};

export const initJudgeEngine = async () => {
  const configuredRunner = (process.env.EXECUTION_RUNNER || "auto").toLowerCase();

  if (configuredRunner === "docker") {
    const available = await isDockerAvailable();
    if (!available) {
      console.error("❌ [JudgeEngine] EXECUTION_RUNNER is 'docker' but Docker daemon is not responding!");
    } else {
      console.log("🐳 [JudgeEngine] Runner mode locked to DOCKER.");
    }
    runnerMode = "docker";
    return runnerMode;
  }

  if (configuredRunner === "native") {
    console.warn("⚠️ [JudgeEngine] EXECUTION_RUNNER explicitly set to 'native'.");
    runnerMode = "native";
    return runnerMode;
  }

  const hasDocker = await isDockerAvailable();
  if (hasDocker) {
    runnerMode = "docker";
    console.log("🐳 [JudgeEngine] Auto-detected Docker daemon. Locked to DOCKER runner mode.");
  } else {
    runnerMode = "native";
    console.warn("⚠️ [JudgeEngine] Docker daemon not found. Falling back to host NATIVE runner mode.");
  }

  return runnerMode;
};

export const getRunnerMode = () => runnerMode;

export const prewarmDockerImages = async () => {
  const currentMode = runnerMode || (await initJudgeEngine());
  if (currentMode !== "docker") return;

  const images = [...new Set(Object.values(configs).map((c) => c.image))];
  console.log("[Prewarm] Pre-warming Docker images:", images);

  for (const image of images) {
    try {
      await runProcess("docker", ["run", "--rm", "--log-driver=none", image, "true"], "", 60000);
      console.log(`[Prewarm] ✅ ${image} ready`);
    } catch {
      console.warn(`[Prewarm] ⚠️ Could not warm ${image}`);
    }
  }
};

export const runProcess = (cmd, args, input = "", timeoutMs = 15000, cwd = process.cwd()) => {
  return new Promise((resolve) => {
    let proc;
    try {
      if (cmd === "docker") {
        proc = spawn("docker", args);
      } else {
        if (args && args.length > 0) {
          proc = spawn(cmd, args, { cwd });
        } else {
          proc = spawn(cmd, [], { cwd, shell: true });
        }
      }
    } catch (err) {
      return resolve({ code: 1, stdout: "", stderr: err.message });
    }

    let stdout = "";
    let stderr = "";
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { proc.kill("SIGKILL"); } catch {}
        resolve({ code: 124, stdout, stderr: "Time Limit Exceeded" });
      }
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      }
    });

    proc.on("error", (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({ code: 1, stdout, stderr: err.message });
      }
    });

    if (input) {
      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch {}
    } else {
      try { proc.stdin.end(); } catch {}
    }
  });
};

export const normalize = (str) => (str ? str.trim().replace(/\s+/g, " ") : "");

export const compileCode = async (tempDir, langConfig, useDocker) => {
  if (useDocker) {
    if (!langConfig.compileCmd) return { code: 0 };
    const tempId = path.basename(tempDir);
    const volumeName = process.env.TEMP_VOLUME_NAME;

    const dockerArgs = ["run", "--rm", "--log-driver=none"];
    if (volumeName) {
      dockerArgs.push("-v", `${volumeName}:/app`, "-w", `/app/${tempId}`);
    } else {
      const dockerDir = toDockerPath(tempDir);
      dockerArgs.push("-v", `${dockerDir}:/app`, "-w", "/app");
    }
    dockerArgs.push(langConfig.image, "sh", "-c", langConfig.compileCmd);
    return runProcess("docker", dockerArgs, "", 15000);
  } else {
    if (!langConfig.nativeCompileCmd) return { code: 0 };
    return runProcess(langConfig.nativeCompileCmd, [], "", 15000, tempDir);
  }
};

export const runSingleTest = async (tc, tempDir, langConfig, timelimit, useDocker) => {
  const sec = Math.max(1, parseInt(timelimit, 10) || 2);
  const maxWaitMs = (sec + 3) * 1000;
  let result;

  if (useDocker) {
    const tempId = path.basename(tempDir);
    const volumeName = process.env.TEMP_VOLUME_NAME;
    const dockerArgs = [
      "run",
      "--rm",
      "--log-driver=none",
      "--memory=128m",
      "--memory-swap=128m",
      "--cpus=0.5",
      "--pids-limit=32",
      "--network=none",
      "--read-only",
      "--tmpfs",
      "/tmp",
      "-i"
    ];

    if (volumeName) {
      dockerArgs.push("-v", `${volumeName}:/app`, "-w", `/app/${tempId}`);
    } else {
      const dockerDir = toDockerPath(tempDir);
      dockerArgs.push("-v", `${dockerDir}:/app`, "-w", "/app");
    }

    dockerArgs.push(
      langConfig.image,
      "sh",
      "-c",
      `timeout -s 9 ${sec} ${langConfig.runCmd}`
    );

    result = await runProcess("docker", dockerArgs, tc.input, maxWaitMs);
  } else {
    if (isWindows) {
      result = await runProcess(langConfig.nativeRunCmd, [], tc.input, maxWaitMs, tempDir);
    } else {
      result = await runProcess(
        "bash",
        ["-c", `ulimit -f 65536 2>/dev/null; timeout -s 9 ${sec} ${langConfig.nativeRunCmd}`],
        tc.input,
        maxWaitMs,
        tempDir
      );
    }
  }

  if (
    result.code === 124 ||
    result.code === 137 ||
    result.code === 143 ||
    result.stderr?.includes("Time Limit Exceeded")
  ) {
    return { verdict: "TLE", input: tc.input };
  }

  if (result.code !== 0) {
    return { verdict: "RE", error: result.stderr || "Runtime error occurred", input: tc.input };
  }

  const actual = normalize(result.stdout);
  const expected = normalize(tc.output);

  return {
    input: tc.input,
    expected,
    actual,
    status: actual === expected ? "PASS" : "WA"
  };
};

export const evaluateFailFast = async (testcases, tempDir, langConfig, timelimit, useDocker) => {
  const results = [];

  for (const tc of testcases) {
    const res = await runSingleTest(tc, tempDir, langConfig, timelimit, useDocker);
    results.push(res);

    if (res.verdict === "TLE") return { verdict: "TLE", results: [] };
    if (res.verdict === "RE") return { verdict: "RE", error: res.error, results };
    if (res.status === "WA") return { verdict: "WA", results };
  }

  return { verdict: "AC", results };
};

export const runJudge = async (testcases, code, language = "C++", timelimit = 2) => {
  const langConfig = configs[language] || configs["C++"];
  const tempId = uuid();
  const tempDir = path.join(process.cwd(), "temp", tempId);

  await fs.mkdir(tempDir, { recursive: true });

  if (language === "JavaScript") {
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify({ type: "commonjs" }));
  }

  const filePath = path.join(tempDir, langConfig.filename);
  await fs.writeFile(filePath, code);

  if (!runnerMode) {
    await initJudgeEngine();
  }

  const useDocker = runnerMode === "docker";

  if (process.env.EXECUTION_RUNNER === "docker" && !useDocker) {
    return {
      verdict: "ERROR",
      error: "Docker execution environment unavailable or malfunctioning"
    };
  }

  try {
    const compileResult = await compileCode(tempDir, langConfig, useDocker);
    if (compileResult.code !== 0) {
      return {
        verdict: "CE",
        error: compileResult.stderr || "Compilation error"
      };
    }
    return await evaluateFailFast(testcases, tempDir, langConfig, timelimit, useDocker);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

export const runSample = async ({ testcases, timelimit }, code, language = "C++") => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, language, timelimit);
};

export const runHidden = async ({ testcases, timelimit }, code, language = "C++") => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, language, timelimit);
};
