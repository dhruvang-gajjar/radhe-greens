const { execSync } = require('child_process');

const fs = require('fs');
const path = require('path');

function getDbUrl() {
  if (process.env.DB_URL) return process.env.DB_URL.trim();
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();

  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/(?:DB_URL|DATABASE_URL)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  return '';
}

const dbUrl = getDbUrl();

if (dbUrl && dbUrl.trim()) {
  console.log('Database URL detected. Synchronizing Prisma schema to database...');
  try {
    process.env.DB_URL = dbUrl.trim();
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✓ Database schema synchronized successfully.');
  } catch (err) {
    console.warn('⚠️ Warning: Prisma DB sync during build encountered an issue (non-fatal):', err.message);
  }
} else {
  console.log('No DB_URL / DATABASE_URL detected during build; skipping auto-migration.');
}
