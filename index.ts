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

const TAGS = [
	"Politics",
	"Government",
	"World",
	"Business",
	"Economy",
	"Finance",
	"Technology",
	"Science",
	"Health",
	"Law & Justice",
	"Crime",
	"Society",
	"Education",
	"Environment",
	"Energy",
	"Media",
	"Culture",
	"Entertainment",
	"Sports",
	"Infrastructure",
	"Events",
	"Travel",
	"Weather",
	"Human Rights",
	"Conflict",
	"Security",
	"Defense",
	"Opinion",
	"Lifestyle",
]

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
			tags: ["Politics", "World"],
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
	"https://www.theguardian.com/world/rss",
	"https://www.aljazeera.com/xml/rss/all.xml",
	"https://www.rt.com/rss/news/",
	"https://www.france24.com/en/rss",
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
		Avoid logo images or images not related to the news, such as "https://www.aljazeera.com/images/logo_aje.png".
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
						Add the most relevant tags to each news item. There are some general tags but you can add others: ${TAGS.join(", ")}.
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
