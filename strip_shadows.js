const fs = require('fs');
const path = require('path');

const filesToProcess = [
  "src/components/ui/Card.jsx",
  "src/screens/cart/Cart.jsx",
  "src/components/orders/PartnerCard.jsx",
  "src/components/orders/OrderSummaryCard.jsx",
  "src/components/orders/EtaCard.jsx",
  "src/components/orders/DeliveryTimeline.jsx",
  "src/components/customer/SettingsRow.jsx",
  "src/components/checkout/AddressCard.jsx",
  "src/components/search/SearchTopBar.jsx",
  "src/components/home/HomeSearchBar.jsx",
  "src/components/search/SearchSuggestionList.jsx",
  "src/screens/dev/FeatureFlags.jsx"
];

for (const relPath of filesToProcess) {
  const fullPath = path.join("e:/yulostore_mobile", relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (relPath === "src/components/ui/Card.jsx") {
    content = content.replace("shadow-md shadow-black/10", "border border-black/[0.06]");
  } else if (relPath === "src/components/search/SearchTopBar.jsx") {
    content = content.replace("shadow-md shadow-black/10", "border border-black/[0.06]");
  } else if (relPath === "src/components/home/HomeSearchBar.jsx") {
    content = content.replace("shadow-md shadow-black/10", "border border-black/[0.06]"); // main bar
    content = content.replace(" shadow-md shadow-black/10", ""); // veg toggle
  } else if (relPath === "src/components/search/SearchSuggestionList.jsx") {
    content = content.replace("shadow-md shadow-black/10", "border border-black/[0.06]");
  } else if (relPath === "src/screens/dev/FeatureFlags.jsx") {
    content = content.replace(/shadow-md shadow-black\/10/g, "border border-black/[0.06]");
  } else {
    // For others, strip shadow classes
    content = content.replace(/\s?shadow-[a-z]+\s?shadow-[^\s'"`}]+/g, "");
    content = content.replace(/\s?shadow-[a-z]+/g, "");
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
}
console.log("Shadows stripped.");
