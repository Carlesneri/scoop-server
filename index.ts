import { encode } from "@toon-format/toon"
import OpenAI from "openai"
import type { ResponseInput } from "openai/resources/responses/responses.mjs"
import { OPENAI_API_KEY } from "./config.ts"
import type { NewsItem } from "./types.ts"

// const itemInterface = {
// 	title: "string",
// 	summary: "string",
// 	urls: [{ link: "string", source: "string" }],
// 	images: [{ link: "string", source: "string" }],
// }

const responseExample = {
	items: [
		{
			title: "Example title",
			summary: "Example summary",
			urls: [
				{
					link: "https://fake-link",
					source: "feed-one",
				},
				{
					link: "https://fake-link",
					source: "feed-two",
				},
			],
			images: [
				{
					link: "https://fake-img.jpg",
					source: "feed-one",
				},
				{
					link: "https://fake-img.avif",
					source: "feed-two",
				},
			],
		},
	],
}

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
})

const RSS_LIST = [
	"https://feedx.net/rss/ap.xml",
	"https://feeds.bbci.co.uk/news/rss.xml",
	"http://rss.cnn.com/rss/cnn_topstories.rss",
	"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",

	// "https://www.infolibre.es/rss",
	// "https://www.eldiario.es/rss",
	// "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ultimas-noticias/portada",
]

async function createRSSInput(rss: string): Promise<ResponseInput> {
	const feedContent = await fetch(rss).then((res) => res.text())

	return [
		{
			role: "system",
			content: `I am a news RSS analyzer that delivers news analyzing RSS.
		The response must be a valid JSON with the following structure: "${JSON.stringify(responseExample)}".
		The summary should be enough descriptive, between 100 and 250 words.
    Each item refers to a news item and groups all the information from all sources, with the corresponding links to each media outlet.
    The images should be proper image type format, from the respective related RSS feeds.
    The RSS I will analyze is: "${encode(feedContent)}"
		If all content is unreachable, return an empty array.
		`,
		},
		{
			role: "user",
			content: `Deliver the latest most important news.`,
		},
	]
}

export async function getNews() {
	try {
		const itemsPromises = RSS_LIST.map(async (rss) => {
			const response = await openai.responses.create({
				model: "gpt-5-mini",
				input: await createRSSInput(rss),
			})

			const parsed = (await JSON.parse(response.output_text)) as {
				items: NewsItem[]
			}

			const { items } = parsed

			return items
		})

		const items = await Promise.all(itemsPromises)

		const flattenedItems = items.flat()

		const response = await openai.responses.create({
			model: "gpt-5-mini",
			input: [
				{
					role: "system",
					content: `I am a news analyzer that delivers a summary of news analyzing news from different sources.
						The response must be a valid JSON with the following structure: "${JSON.stringify(responseExample)}".
						The summary should be enough descriptive, between 100 and 300 words.
						Each item refers to a all news about same or similar information, and groups all the information from all sources, with the corresponding links to each media outlet.
						The images should be proper image type format, from the respective related RSS feeds.
						The news I will analyze is: "${encode(flattenedItems)}"
					`,
				},
				{
					role: "user",
					content: `Deliver the latest most important news.`,
				},
			],
		})

		const finalParsed = (await JSON.parse(response.output_text)) as {
			items: NewsItem[]
		}

		const finalItems = finalParsed.items

		return finalItems
	} catch (e) {
		console.error(e)

		return []
	}
}

getNews()
