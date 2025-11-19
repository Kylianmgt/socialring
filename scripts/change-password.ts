#!/usr/bin/env node

import 'dotenv/config';
import { Pool } from 'pg';
import { encrypt } from '../src/lib/encryption';
import { validatePasswordStrength } from '../src/lib/password-validation';
import * as readline from 'readline';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}
const pool = new Pool({ connectionString });

interface UserResult {
  id: string;
  email: string | null;
  name: string | null;
  encrypted_global_password: string | null;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  try {
    console.log('\n🔐 Change Global Password\n');

    // Get user ID or email
    const userInput = await question('Enter user ID or email: ');
    if (!userInput.trim()) {
      console.error('❌ User ID or email is required');
      process.exit(1);
    }

    // Find user by ID or email
    let user: UserResult | undefined;
    
    if (userInput.includes('@')) {
      // Search by email
      const result = await pool.query(
        'SELECT id, email, name, encrypted_global_password FROM users WHERE email = $1 LIMIT 1',
        [userInput]
      );
      user = result.rows[0] as UserResult | undefined;
    } else {
      // Search by ID
      const result = await pool.query(
        'SELECT id, email, name, encrypted_global_password FROM users WHERE id = $1 LIMIT 1',
        [userInput]
      );
      user = result.rows[0] as UserResult | undefined;
    }

    if (!user) {
      console.error(`❌ User not found: ${userInput}`);
      process.exit(1);
    }

    console.log(`\n✓ User found: ${user.name || user.email || user.id}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email || 'N/A'}`);
    console.log(`  Password set: ${user.encrypted_global_password ? 'Yes' : 'No'}\n`);

    // Get new password
    const newPassword = await question('Enter new password: ');
    
    // Validate password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      console.error('\n❌ Password does not meet requirements:');
      validation.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm new password: ');
    if (newPassword !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    // Encrypt the password
    const encryptedGlobalPassword = encrypt('valid', newPassword);

    // Update user using raw SQL
    await pool.query(
      'UPDATE users SET encrypted_global_password = $1 WHERE id = $2',
      [encryptedGlobalPassword, user.id]
    );

    console.log('\n✅ Global password updated successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
