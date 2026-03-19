import imageSize from "probe-image-size"

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
