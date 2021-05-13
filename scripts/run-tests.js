const childProcess = require('child_process');

// skip ts-node type checks (this is already covered in previous 'build-test' script)
process.env.TS_NODE_TRANSPILE_ONLY = "true";

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;

// only Build tests in local environment
const shouldBuildTests = !isGithubActions;

childProcess.execSync("yarn build");

// if (shouldBuildTests) {
//   childProcess.execSync("yarn build-test");
// }

function runTests() {
  console.time("Total test time");

  try {
    childProcess.execSync(
      `yarn wsrun --serial --fast-exit test`
    );
  } finally {
    console.timeEnd("Total test time");
  }
}

async function main() {
  await runTests();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
