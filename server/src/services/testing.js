// const { exec } = require("child_process");
import {exec} from "child_process";
exec("docker --version", (err, stdout, stderr) => {
  if (err) {
    console.error("ERROR:", err);
  } else {
    console.log(stdout);
  }
});