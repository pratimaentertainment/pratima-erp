const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const ARTIFACT_PATH = 'C:/Users/suhas/.gemini/antigravity/brain/42eb21ca-ece7-4fb7-9f98-fc40b8d4efed/phase_2_implementation.md';

const readSafe = (file) => {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return `File not found: ${file}`; }
};

let buildOutput = '';
try {
  buildOutput = cp.execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  buildOutput = e.stdout + '\n' + e.stderr;
}

let treeOutput = '';
try {
  treeOutput = cp.execSync('npx tree-cli -l 4 -o out.txt --ignore node_modules,.git,.next', { encoding: 'utf8' });
  treeOutput = fs.readFileSync('out.txt', 'utf8');
} catch (e) {
  treeOutput = 'Tree generation failed.';
}

const md = `
# Phase 2: User Management Implementation

## 1. Updated prisma/schema.prisma
\`\`\`prisma
${readSafe('prisma/schema.prisma')}
\`\`\`

## 2. Folder structure
\`\`\`text
${treeOutput}
\`\`\`

## 3. User Repository
\`\`\`typescript
${readSafe('src/repositories/user.repository.ts')}
\`\`\`

## 4. User Service
\`\`\`typescript
${readSafe('src/services/user.service.ts')}
\`\`\`

## 5. User API
\`\`\`typescript
${readSafe('src/app/api/v1/users/route.ts')}
\`\`\`

## 6. User Server Actions
\`\`\`typescript
${readSafe('src/app/actions/user.actions.ts')}
\`\`\`

## 7. Zod Validation
\`\`\`typescript
${readSafe('src/lib/validations/user.schema.ts')}
\`\`\`

## 8. TanStack Table
\`\`\`typescript
${readSafe('src/app/(dashboard)/users/data-table.tsx')}
\`\`\`

## 9. User Form
\`\`\`typescript
${readSafe('src/app/(dashboard)/users/user-form.tsx')}
\`\`\`

## 10. User Drawer
\`\`\`typescript
${readSafe('src/app/(dashboard)/users/user-drawer.tsx')}
\`\`\`

## 11. Permission Middleware
\`\`\`typescript
${readSafe('src/proxy.ts')}
\`\`\`

## 12. Login Session implementation
\`\`\`typescript
${readSafe('src/auth.ts')}
\`\`\`

## 13. Audit Log implementation
*(Integrated directly inside \`src/services/user.service.ts\` for every operation)*
\`\`\`typescript
// Example from user.service.ts:
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'CREATE',
          entityType: 'USER',
          entityId: newUser.id,
          details: { createdFields: restData } as any,
        },
      });
\`\`\`

## 14. Build Output
\`\`\`text
${buildOutput}
\`\`\`

## 15. Screenshots

### User List
![User List](file:///C:/Users/suhas/.gemini/antigravity/brain/42eb21ca-ece7-4fb7-9f98-fc40b8d4efed/user_list_screenshot_1783021720439.jpg)

### Create User
![Create User](file:///C:/Users/suhas/.gemini/antigravity/brain/42eb21ca-ece7-4fb7-9f98-fc40b8d4efed/create_user_screenshot_1783021729831.jpg)

### Edit User
![Edit User](file:///C:/Users/suhas/.gemini/antigravity/brain/42eb21ca-ece7-4fb7-9f98-fc40b8d4efed/edit_user_screenshot_1783021746905.jpg)

### Profile Page
![Profile Page](file:///C:/Users/suhas/.gemini/antigravity/brain/42eb21ca-ece7-4fb7-9f98-fc40b8d4efed/profile_page_screenshot_1783021759229.jpg)
`;

fs.writeFileSync(ARTIFACT_PATH, md);
console.log('Artifact generated successfully.');
