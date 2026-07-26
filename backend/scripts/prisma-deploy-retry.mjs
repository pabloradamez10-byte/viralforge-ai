import { spawn } from 'node:child_process';

const maxAttempts = Number(process.env.PRISMA_DEPLOY_MAX_ATTEMPTS || 8);
const baseDelayMs = Number(process.env.PRISMA_DEPLOY_RETRY_DELAY_MS || 5000);

function runPrismaDeploy() {
  return new Promise((resolve) => {
    const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`Prisma deploy attempt ${attempt}/${maxAttempts}`);
  const code = await runPrismaDeploy();

  if (code === 0) {
    console.log('Prisma migrations applied successfully.');
    process.exit(0);
  }

  if (attempt === maxAttempts) {
    console.error('Prisma deploy failed after all retry attempts.');
    process.exit(code);
  }

  const delayMs = Math.min(baseDelayMs * attempt, 30000);
  console.warn(`Database unavailable. Retrying Prisma deploy in ${Math.round(delayMs / 1000)}s...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
