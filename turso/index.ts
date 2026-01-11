import { createClient } from "@libsql/client"
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from "../config.ts"

export const turso = createClient({
	url: TURSO_DATABASE_URL || "",
	authToken: TURSO_AUTH_TOKEN || "",
})

export interface NewsItemRow {
	title: string
	summary: string
	urls: { link: string; source: string }[]
	images: { link: string; source: string }[]
}

export async function insertNewsItem({
	title,
	summary,
	urls,
	images,
}: NewsItemRow) {
	return await turso
		.execute(
			"INSERT INTO news (title, summary, urls, images, created_at) VALUES (?, ?, ?, ?, ?);",
			[
				title,
				summary,
				JSON.stringify(urls),
				JSON.stringify(images),
				Date.now(),
			],
		)
		.catch((e) => console.error("Error inserting news item:", e))
}

export async function insertNews(items: NewsItemRow[]) {
	const promises = items.map((item) => insertNewsItem(item))
	await Promise.allSettled(promises)
}
