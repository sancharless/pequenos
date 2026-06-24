$vars = @(
  @{ name = "NEXT_PUBLIC_SUPABASE_URL"; val = "https://xzqocykygtooyxamombj.supabase.co" },
  @{ name = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; val = "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" },
  @{ name = "SUPABASE_SERVICE_ROLE_KEY"; val = "sb_publishable_aDewurK1M9hG_udDmmDyHQ_BHMQj6nb" },
  @{ name = "SUPPLIER_API_URL"; val = "https://smmpainel.com/api/v2" },
  @{ name = "SUPPLIER_API_KEY"; val = "d8bfae98c28440aa77873ef4d109d52a" }
)

foreach ($item in $vars) {
  $key = $item.name
  $val = $item.val
  Write-Host "Adding $key to production..."
  npx vercel env add $key production --value $val --yes --force --non-interactive
}
Write-Host "Done adding all production environment variables!"
