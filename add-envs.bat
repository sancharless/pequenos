@echo off
echo Adding NEXT_PUBLIC_SUPABASE_URL...
call npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --value "https://xzqocykygtooyxamombj.supabase.co" --yes --force --non-interactive

echo Adding NEXT_PUBLIC_SUPABASE_ANON_KEY...
call npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --value "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" --yes --force --non-interactive

echo Adding SUPABASE_SERVICE_ROLE_KEY...
call npx vercel env add SUPABASE_SERVICE_ROLE_KEY production --value "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" --yes --force --non-interactive

echo Adding SUPPLIER_API_URL...
call npx vercel env add SUPPLIER_API_URL production --value "https://smmpainel.com/api/v2" --yes --force --non-interactive

echo Adding SUPPLIER_API_KEY...
call npx vercel env add SUPPLIER_API_KEY production --value "d8bfae98c28440aa77873ef4d109d52a" --yes --force --non-interactive

echo Done!
