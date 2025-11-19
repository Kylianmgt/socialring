import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startDatabase() {
  try {
    const projectRoot = join(__dirname, '..');
    
    console.log('Starting PostgreSQL database...');
    
    const { stdout } = await execAsync('docker-compose up -d db', {
      cwd: projectRoot,
    });
    
    console.log(stdout);
    
    // Wait for database to be ready
    console.log('Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if database is running
    const { stdout: psOutput } = await execAsync('docker-compose ps db', {
      cwd: projectRoot,
    });
    
    if (psOutput.includes('Up')) {
      console.log('✅ Database is running on localhost:5432');
    } else {
      console.error('❌ Failed to start database');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting database:', error);
    process.exit(1);
  }
}

startDatabase();
