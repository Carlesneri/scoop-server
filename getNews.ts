import { encode } from "@toon-format/toon"
import OpenAI from "openai"
import { DEEPSEEK_API_KEY } from "./config.ts"
import { getLatestNews } from "./turso/index.ts"
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
	baseURL: "https://api.deepseek.com",
	apiKey: DEEPSEEK_API_KEY,
})

const MODEL = "deepseek-reasoner"

const RSS_LIST = [
	"https://www.rt.com/rss/news/",
	"https://feedx.net/rss/ap.xml",
	"https://feeds.bbci.co.uk/news/rss.xml",
	"http://rss.cnn.com/rss/cnn_topstories.rss",
	"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
	"https://www.theguardian.com/world/rss",
	"https://www.aljazeera.com/xml/rss/all.xml",
	"https://www.france24.com/en/rss",

	// "https://www.infolibre.es/rss",
	// "https://www.eldiario.es/rss",
	// "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ultimas-noticias/portada",
]

function responseCleaner(content: string) {
	return content.replace(/(^```json|\n|```$)/g, "")
}

export async function getNews() {
	try {
		const rssResponsePromise = (rss: string) => async () => {
			const feedContent = await fetch(rss).then((res) => res.text())

			const splittedContent = feedContent.split(" ")

			const slicedContent = splittedContent.slice(0, 30000).join(" ")

			const response = await openai.chat.completions.create({
				model: MODEL,
				messages: [
					{
						role: "system",
						content: `I am a news RSS analyzer that delivers news analyzing RSS.
						My language is english.
						The RSS I am analyzing is: "${encode(slicedContent)}"
						The response must be a list of news items, each containing a summary, the related images, and the link to the news article.
						The summary should be enough descriptive, between 200 and 250 words.
						The images should be proper image type format, from the respective related RSS feed.
						Avoid logo images or images not related to the news, such as "https://www.aljazeera.com/images/logo_aje.png".
						If all content is unreachable, return an empty string.`,
					},
					{
						role: "user",
						content: `Deliver the latest 10 most important news.`,
					},
				],
			})

			return response.choices[0].message.content
		}

		const responses: string[] = []

		for (const rss of RSS_LIST) {
			const rssResponse = await rssResponsePromise(rss)().catch((e) => {
				console.error(`Error processing RSS ${rss}:`, e)
			})

			if (rssResponse) {
				responses.push(rssResponse)
			}
		}

		const latestNews = await getLatestNews({ limit: 24 })

		const response = await openai.chat.completions.create({
			model: MODEL,
			messages: [
				{
					role: "system",
					content: `I am a news analyzer that delivers a list of articles analyzing news from different sources.
					The response must be a valid stringified JSON, ready to be parsed, with the following structure: "${JSON.stringify(responseExample)}".
					The summary should be enough descriptive, between 100 and 300 words.
					Add the most relevant tags to each article. There are some general tags but you can add others: ${TAGS.join(", ")}.
					Each article refers to a all news about same or similar information, and groups all the information from all sources, with the corresponding links to each media outlet.
					The images should be proper image type format, from the respective related RSS feeds.
					`,
				},
				{
					role: "user",
					content: `Analyze "${encode(responses)}" and deliver the latest most important articles.
					Check <latest-news>"${encode(latestNews)}"</latest-news> so you do not include news that are already included.`,
				},
			],
		})

		const { content } = response.choices[0].message

		if (!content) {
			return []
		}

		const cleanedContent = responseCleaner(content)

		const finalParsed = JSON.parse(cleanedContent) as {
			items: NewsItem[]
		}

		const finalItems = finalParsed.items

		return finalItems
	} catch (e) {
		console.error(e)

		return []
	}
}
