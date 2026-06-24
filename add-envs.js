const { execSync } = require('child_process');

const vars = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", val: "https://xzqocykygtooyxamombj.supabase.co" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", val: "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", val: "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" },
  { name: "SUPPLIER_API_URL", val: "https://smmpainel.com/api/v2" },
  { name: "SUPPLIER_API_KEY", val: "d8bfae98c28440aa77873ef4d109d52a" }
];

for (const item of vars) {
  const cmd = `npx vercel env add ${item.name} production --value "${item.val}" --yes --force --non-interactive`;
  console.log(`Executing: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error adding ${item.name}:`, error.message);
  }
}
console.log("All environment variables added!");
