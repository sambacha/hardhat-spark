import * as shell from 'shelljs';

// skip ts-node type checks (this is already covered in previous 'build-test' script)
process.env.TS_NODE_TRANSPILE_ONLY = "true";

const isGithubActions = process.env.GITHUB_WORKFLOW !== undefined;

// only Build tests in local environment
const shouldBuildTests = !isGithubActions;

shell.exec("yarn build");

if (shouldBuildTests) {
  shell.exec("yarn build-test");
}

function runTests() {
  console.time("Total test time");

  try {
    shell.exec(
      `yarn wsrun --serial --fast-exit --exclude-missing test`
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
