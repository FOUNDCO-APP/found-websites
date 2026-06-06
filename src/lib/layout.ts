export type LayoutType = "impact" | "editorial" | "portrait" | "cinematic"

const matrix: Record<string, Record<string, LayoutType>> = {
  home_services: { bold: "impact", calm: "impact", modern: "cinematic", warm: "portrait" },
  wellness:      { bold: "cinematic", calm: "editorial", modern: "editorial", warm: "portrait" },
  food:          { bold: "portrait", calm: "portrait", modern: "cinematic", warm: "portrait" },
  events:        { bold: "cinematic", calm: "editorial", modern: "cinematic", warm: "cinematic" },
  retail:        { bold: "portrait", calm: "editorial", modern: "cinematic", warm: "portrait" },
  fitness:       { bold: "impact", calm: "cinematic", modern: "cinematic", warm: "impact" },
  beauty:        { bold: "cinematic", calm: "editorial", modern: "editorial", warm: "portrait" },
  automotive:    { bold: "impact", calm: "impact", modern: "cinematic", warm: "portrait" },
  pet_services:  { bold: "portrait", calm: "editorial", modern: "editorial", warm: "portrait" },
  cleaning:      { bold: "impact", calm: "editorial", modern: "cinematic", warm: "impact" },
  landscaping:   { bold: "impact", calm: "portrait", modern: "cinematic", warm: "portrait" },
  real_estate:    { bold: "impact", calm: "editorial", modern: "cinematic", warm: "portrait" },
}

export function getLayout(industryCategory: string, vibe: string): LayoutType {
  return matrix[industryCategory]?.[vibe as keyof typeof matrix[string]] ?? "impact"
}
