import { encode } from "@toon-format/toon"
import { createGateway, generateImage } from "ai"
import imageSize from "probe-image-size"
import { Agent } from "undici"
import type { NewsItemRow } from "./turso"

export function responseCleaner(content: string) {
	return content.replace(/(^```json|\n|```$)/g, "")
}

export async function sortImages(images: { link: string; source: string }[]) {
	const imageSizes = await Promise.all(
		images.map(async (image) => {
			const size = await imageSize(image.link).catch(() => null)
			return { ...image, size }
		}),
	)

	return imageSizes
		.filter((image) => image.size !== null)
		.sort(
			(a, b) =>
				(b.size?.width || 0) * (b.size?.height || 0) -
				(a.size?.width || 0) * (a.size?.height || 0),
		)
}

export function shuffleRssList(array: string[]) {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}
	return shuffled.slice(0, 5)
}

export const gateway = createGateway({
	fetch: (url, init) =>
		fetch(url, {
			...init,
			dispatcher: new Agent({
				headersTimeout: 15 * 60 * 1000, // 15 minutes
				bodyTimeout: 15 * 60 * 1000,
			}),
		} as RequestInit),
})

export async function addAiImageToArticle(items: NewsItemRow[]) {
	const addImagePromises = items.map(async (item) => {
		try {
			const response = await generateImage({
				model: gateway.image("recraft/recraft-v4"),
				prompt: `Generate an image that describes this summary <summary>${encode(item.summary)}<summary>`,
				n: 1,
			})

			return { ...item, mainImage: response.images?.[0]?.base64 }
		} catch (error) {
			console.error(error)

			return { ...item, mainImage: "" }
		}
	})

	const finalItems = await Promise.all(addImagePromises)

	return finalItems
}
