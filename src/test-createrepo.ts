// Direct test script for createRepo — no MCP server needed.
// Usage: node dist/test-createrepo.js <name> <description> [isPrivate] [org] [teamName] [appId]

import { createRepo } from './github-repos.js';

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: node dist/test-createrepo.js <name> <description> [isPrivate] [org] [teamName] [appId]');
    console.error('');
    console.error('  name         Repository name (required)');
    console.error('  description  Repository description (required)');
    console.error('  isPrivate    true or false (optional, defaults to true)');
    console.error('  org          GitHub organization name (optional)');
    console.error('  teamName     Team name custom property (optional)');
    console.error('  appId        Application id custom property (optional)');
    process.exit(1);
}

const [name, description, isPrivateStr, org, teamName, appId] = args;

if (isPrivateStr !== undefined && isPrivateStr !== 'true' && isPrivateStr !== 'false') {
    console.error(`Error: isPrivate must be 'true' or 'false', got '${isPrivateStr}'`);
    process.exit(1);
}

const isPrivate = isPrivateStr === undefined ? true : isPrivateStr === 'true';

console.log('==> Calling createRepo directly...');
console.log(`    name:        ${name}`);
console.log(`    description: ${description}`);
console.log(`    isPrivate:   ${isPrivate}`);
console.log(`    org:         ${org ?? '<not set>'}`);
console.log(`    teamName:    ${teamName ?? '<not set>'}`);
console.log(`    appId:       ${appId ?? '<not set>'}`);
console.log('');

try {
    const result = await createRepo(name, description, isPrivate, org, teamName, appId);
    console.log('==> Result:', result);
} catch (error: any) {
    console.error('==> Error:', error.message ?? error);
    process.exit(1);
}
