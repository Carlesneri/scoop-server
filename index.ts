import OpenAI from "openai"
import type { ResponseInput } from "openai/resources/responses/responses.mjs"
import { OPENAI_API_KEY } from "./config.ts"
import type { NewsItem } from "./types.ts"

const itemInterface = {
	title: "string",
	summary: "string",
	urls: [{ link: "string", source: "string" }],
	images: [{ link: "string", source: "string" }],
}

const responseExample = {
	feeds: ["feed-one", "feed-two"],
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

const input: ResponseInput = [
	{
		role: "system",
		content: `I am a news RSS analyzer that delivers news analyzing RSS, that is an array of items that must meet the contract: "${JSON.stringify(itemInterface)}".
		The response must be a valid JSON with the following structure: "${JSON.stringify(responseExample)}".
    Each item refers to a news item and groups all the information from all sources, with the corresponding links to each media outlet.
    The images should be proper image type format, from the respective related RSS feeds.
    The RSS I will analyze are: "${JSON.stringify(RSS_LIST)}"
		If I can not get results, I will return an empty array.
		`,
	},
	{
		role: "user",
		content: `Deliver the latest most important news.`,
	},
]

export async function getNews() {
	try {
		const response = await openai.responses.create({
			model: "gpt-5-mini",
			input,
			tools: [{ type: "web_search_preview" }],
		})

		const parsed = (await JSON.parse(response.output_text)) as {
			feeds: [string]
			items: NewsItem[]
		}

		const { items } = parsed

		console.log({ items })

		return items
	} catch (e) {
		console.error(e)

		return []
	}
}
