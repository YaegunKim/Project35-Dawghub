// Same icon assets UGA's own Nutrislice-powered dining menu uses for these tags.
const ICON_BASE = 'https://custom-icons.nutrislice.com/uga.nutrislice.com/special_diet/custom_icons'

export const DIETARY_ICON_URLS: Record<string, string> = {
  vegan: `${ICON_BASE}/Vegan.png`,
  vegetarian: `${ICON_BASE}/vegetarian.png`,
  glutenFriendly: `${ICON_BASE}/Gluten-Free.png`,
  heartHealthy: `${ICON_BASE}/Heart-Healthy.png`,
  halal: `${ICON_BASE}/Halal.png`,
}

export const ALLERGEN_ICON_URLS: Record<string, string> = {
  milk: `${ICON_BASE}/Contains-Milk.png`,
  eggs: `${ICON_BASE}/Contains-Egg.png`,
  wheat: `${ICON_BASE}/Contains-Wheat.png`,
  sesame: `${ICON_BASE}/Sesame_Seeds_-_w.png`,
  soy: `${ICON_BASE}/Contains-Soy.png`,
  fish: `${ICON_BASE}/Contains-Fish.png`,
  shellfish: `${ICON_BASE}/Contains-Shellfish.png`,
  treeNuts: `${ICON_BASE}/Contains-Tree-Nuts.png`,
  peanuts: `${ICON_BASE}/Contains-Peanuts.png`,
}
