import type { AppSyncResolverHandler } from 'aws-lambda'

const NUTRISLICE_SCHOOL_IDS: Record<string, number> = {
  bolton: 44401,
  hillside: 70621,
  oglethorpe: 44402,
  snelling: 44403,
  niche: 44404,
  villageSummit: 44405,
}

const NUTRISLICE_MENU_TYPE_IDS: Record<string, number> = {
  breakfast: 13832,
  lunch: 13833,
  dinner: 13986,
}

// Station/section names that are condiments or extras rather than dishes — pushed
// after everything else so the remaining (main) items surface first in the UI.
const SECONDARY_SECTION_KEYWORDS = [
  'condiment',
  'beverage',
  'drink',
  'dessert',
  'cereal',
  'fruit',
  'yogurt',
  'salad bar',
  'bread',
  'bagel',
  'jam',
  'sauce',
  'dressing',
  'topping',
]

function isSecondarySection(sectionName: string): boolean {
  const lower = sectionName.toLowerCase()
  return SECONDARY_SECTION_KEYWORDS.some((keyword) => lower.includes(keyword))
}

// Maps Nutrislice's food-icon slugs to the compact keys the frontend renders as badges.
// Icons not listed here (e.g. "taste-of-home") are dropped rather than shown as raw slugs.
const DIETARY_SLUG_MAP: Record<string, string> = {
  vegan: 'vegan',
  meatless: 'vegetarian',
  'gluten-friendly': 'glutenFriendly',
  'heart-healthy': 'heartHealthy',
  halal: 'halal',
}

const ALLERGEN_SLUG_MAP: Record<string, string> = {
  milk: 'milk',
  eggs: 'eggs',
  wheat: 'wheat',
  sesame: 'sesame',
  soybeans: 'soy',
  fish: 'fish',
  'crustacean-shellfish': 'shellfish',
  'tree-nuts': 'treeNuts',
  peanuts: 'peanuts',
}

type Args = {
  hallSlug: string
  mealType: string
}

type MenuItemResult = {
  name: string
  section: string
  dietary: string[]
  allergens: string[]
}

type Result = {
  hallSlug: string
  mealType: string
  date: string | null
  items: MenuItemResult[]
}

type NutrisliceFoodIcon = {
  slug?: string
}

type NutrisliceFood = {
  name?: string
  icons?: { food_icons?: NutrisliceFoodIcon[] }
}

type NutrisliceFoodItem = {
  menu_id?: number
  is_section_title?: boolean
  food?: NutrisliceFood | null
}

type NutrisliceSectionInfo = {
  position: number
  section_options?: { display_name?: string }
}

type NutrisliceDay = {
  date: string
  menu_items?: NutrisliceFoodItem[]
  menu_info?: Record<string, NutrisliceSectionInfo>
}

type NutrisliceWeekResponse = {
  days?: NutrisliceDay[]
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { hallSlug, mealType } = event.arguments

  const schoolId = NUTRISLICE_SCHOOL_IDS[hallSlug]
  const menuTypeId = NUTRISLICE_MENU_TYPE_IDS[mealType]

  if (!schoolId || !menuTypeId) {
    throw new Error(`Unknown dining hall "${hallSlug}" or meal type "${mealType}"`)
  }

  const today = new Date()
  const year = today.getUTCFullYear()
  const month = String(today.getUTCMonth() + 1).padStart(2, '0')
  const day = String(today.getUTCDate()).padStart(2, '0')
  const isoDate = `${year}-${month}-${day}`

  const url = `https://uga.api.nutrislice.com/menu/api/weeks/school/${schoolId}/menu-type/${menuTypeId}/${year}/${month}/${day}/`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Nutrislice request failed with status ${response.status}`)
  }

  const data: NutrisliceWeekResponse = await response.json()
  const todayEntry = (data.days ?? []).find((entry) => entry.date === isoDate)
  const sections = todayEntry?.menu_info ?? {}

  const foodItems = (todayEntry?.menu_items ?? [])
    .filter((item) => !item.is_section_title && item.food?.name)
    .map((item) => {
      const section = sections[String(item.menu_id)]
      const iconSlugs = (item.food?.icons?.food_icons ?? []).map((icon) => icon.slug).filter(Boolean) as string[]
      const dietary = [...new Set(iconSlugs.map((slug) => DIETARY_SLUG_MAP[slug]).filter(Boolean))]
      const allergens = [...new Set(iconSlugs.map((slug) => ALLERGEN_SLUG_MAP[slug]).filter(Boolean))]
      return {
        name: item.food!.name!,
        sectionName: section?.section_options?.display_name ?? '',
        sectionPosition: section?.position ?? Number.MAX_SAFE_INTEGER,
        dietary,
        allergens,
      }
    })
    .sort((a, b) => {
      const aSecondary = isSecondarySection(a.sectionName)
      const bSecondary = isSecondarySection(b.sectionName)
      if (aSecondary !== bSecondary) return aSecondary ? 1 : -1
      return a.sectionPosition - b.sectionPosition
    })

  const items: MenuItemResult[] = []
  const seenNames = new Set<string>()
  for (const item of foodItems) {
    if (seenNames.has(item.name)) continue
    seenNames.add(item.name)
    items.push({ name: item.name, section: item.sectionName, dietary: item.dietary, allergens: item.allergens })
  }

  return {
    hallSlug,
    mealType,
    date: todayEntry?.date ?? null,
    items,
  }
}
