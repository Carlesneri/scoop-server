import { createClient } from "@libsql/client"
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from "../config.ts"
import { sortImages } from "../utils.ts"

export const turso = createClient({
	url: TURSO_DATABASE_URL || "",
	authToken: TURSO_AUTH_TOKEN || "",
})

export interface NewsItemRow {
	title: string
	summary: string
	mainImage?: string
	urls: { link: string; source: string }[]
	images: { link: string; source: string }[]
	tags?: string[]
	created_at?: number
}

export async function insertNewsItem({
	title,
	summary,
	mainImage = "",
	urls,
	images,
	tags = [],
}: NewsItemRow) {
	return await turso
		.execute(
			"INSERT INTO news (title, summary, mainImage, urls, images, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
			[
				title,
				summary,
				mainImage,
				JSON.stringify(urls),
				JSON.stringify(images),
				JSON.stringify(tags),
				Date.now(),
			],
		)
		.catch((e) => console.error("Error inserting news item:", e))
}

export async function insertNews(items: NewsItemRow[]) {
	let itemsInserted = 0
	try {
		for (const item of items) {
			const sortedImages = await sortImages(item.images)

			await insertNewsItem({ ...item, images: sortedImages })

			itemsInserted++
		}

		return { itemsInserted }
	} catch (error) {
		console.error(error)

		return null
	}
}

export async function getLatestNews({ limit = 24 }: { limit?: number } = {}) {
	const latestNews = await turso.execute(`
    SELECT title, created_at
    FROM news
    ORDER BY created_at DESC
    LIMIT ${limit};
  `)

	return latestNews.rows
}
