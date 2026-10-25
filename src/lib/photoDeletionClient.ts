export type PhotoDeleteError = { id: string; message: string; uses: string[] }

export function photoDeleteErrorText(errors: PhotoDeleteError[]) {
  const messages = Array.from(new Set(errors.map(error => error.message)))
  const uses = Array.from(new Set(errors.flatMap(error => error.uses)))
    .filter(use => !messages.some(message => message.toLowerCase().includes(use.toLowerCase())))
  return [...messages, ...(uses.length ? [`Affected uses: ${uses.join(", ")}.`] : [])].join(" ")
}

export async function deletePhotosConfirmed(ids: string[], request: typeof fetch = fetch) {
  const results = await Promise.all(ids.map(async id => {
    try {
      const response = await request("/api/photos", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      })
      const body = await response.json().catch(() => null)
      const deleted = response.ok && body?.success === true
      const error: PhotoDeleteError | undefined = deleted ? undefined : {
        id,
        message: typeof body?.error === "string" && body.error.trim() ? body.error : "Photo couldn't be deleted. Try again.",
        uses: Array.isArray(body?.uses) ? body.uses.filter((use: unknown): use is string => typeof use === "string" && Boolean(use.trim())) : [],
      }
      return { id, deleted, error }
    } catch {
      return { id, deleted: false, error: { id, message: "Photo couldn't be deleted. Try again.", uses: [] } as PhotoDeleteError }
    }
  }))
  return { deletedIds: results.filter(result => result.deleted).map(result => result.id), failedIds: results.filter(result => !result.deleted).map(result => result.id),
    errors: results.flatMap(result => result.error ? [result.error] : []) }
}
