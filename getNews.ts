import { encode } from "@toon-format/toon"
import { generateText, type LanguageModel, Output } from "ai"
import z from "zod"
import { getLatestNews } from "./turso/index.ts"
import type { NewsItem } from "./types.ts"

const RSS_MODEL: LanguageModel = "mistral/ministral-3b"
const NEWS_MODEL: LanguageModel = "deepseek/deepseek-v3.2"

const TAGS = [
	"Politics",
	"Government",
	"Business",
	"Economy",
	"Finance",
	"Technology",
	"Robotics",
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
	"Books",
	"Movies",
	"Music",
	"Sports",
	"Formula 1",
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
	"USA",
	"Spain",
	"Valencia",
]

const READ_LABEL_TIME = "read-rss"
const WRITE_LABEL_TIME = "write-news"

const newsSchema = z.object({
	items: z.array(
		z.object({
			title: z.string(),
			summary: z.string(),
			urls: z.array(
				z.object({
					link: z.string(),
					source: z.string(),
				}),
			),
			images: z.array(
				z.object({
					link: z.string(),
					source: z.string(),
				}),
			),
			tags: z.array(z.string()),
		}),
	),
})

const newsExample = {
	items: [
		{
			title: "Here comes the title",
			summary: "This is the summary of the news",
			urls: [
				{
					link: "https://fakeurl.com",
					source: "fake rss",
				},
			],
			images: [
				{
					link: "https://fakeurl.com",
					source: "fake rss",
				},
			],
			tags: ["technology, politics, finance"],
		},
	],
}

export async function getNews(rssList: string[]): Promise<NewsItem[]> {
	try {
		const rssResponsePromise = (rss: string) => async () => {
			const feedContent = await fetch(rss)
				.then((res) => res.text())
				.catch((e) => {
					console.error(`Error fetching RSS ${rss}:`, e)

					return ""
				})

			const splittedContent = feedContent.split(" ")

			const slicedContent = splittedContent.slice(0, 30000).join(" ")

			const { text } = await generateText({
				model: RSS_MODEL,
				messages: [
					{
						role: "system",
						content: `I am a news RSS analyzer that delivers news analyzing RSS.
						My language is english.
						The RSS I am analyzing is: "${encode(slicedContent)}"
						The response must be a list of news items, each containing the content, the related images, and the link to the news article.
						The content should be enough descriptive, between 200 and 250 words.
						The images should be proper image type format, from the respective related RSS feed.
						Avoid logo images, such as "https://www.aljazeera.com/images/logo_aje.png".
						`,
					},
					{
						role: "user",
						content: `Deliver the latest 10 most important news.`,
					},
				],
			})

			return text
		}

		console.time(READ_LABEL_TIME)

		const responses: string[] = []

		for (const rss of rssList) {
			const rssResponse = await rssResponsePromise(rss)().catch((e) => {
				console.error(`Error processing RSS ${rss}:`, e)
			})

			if (rssResponse) {
				responses.push(rssResponse)
			}
		}

		console.timeEnd(READ_LABEL_TIME)

		const latestNews = await getLatestNews({ limit: 24 })

		console.time(WRITE_LABEL_TIME)

		const response = await generateText({
			model: NEWS_MODEL,
			output: Output.object({
				schema: newsSchema,
			}),
			messages: [
				{
					role: "system",
					content: `I am a news analyzer that delivers a list of articles analyzing news from different sources.
					Each article refers to a all news about same information, and groups all the information from all sources.
					The title of each article should be a concise and catchy headline, that refears to the main or the most interesting point of the article, always specific, with no generalities, no more than 20 words long.
					The summary is the content of the article, which should be enough descriptive and specific, with the most relevant information included, with no generalities, between 150 and 500 words. You can use Markdown format to structure the content, using paragraphs, lists, and other formatting elements to make it more readable and engaging.
					The urls are the corresponding links to each media outlet.
					The images should be proper image type format, from the respective related RSS feeds.
					Add the most relevant tags to each article, up to 5 tags. There are some general tags but you can add others: ${TAGS.join(", ")}.
					Response must meet the interface of this example: "${encode(JSON.stringify(newsExample))}".
					`,
				},
				{
					role: "user",
					content: `Analyze "${encode(responses)}" and deliver the latest most important articles.
					Check <latest-news>"${encode(latestNews)}"</latest-news> so you do not include news that are already included.`,
				},
			],
		})

		console.timeEnd(WRITE_LABEL_TIME)

		const { text } = response

		if (!text) {
			console.error("No valid response text found.")
			return []
		}

		const finalParsed = JSON.parse(text) as {
			items: NewsItem[]
		}

		const finalItems = finalParsed.items

		return finalItems
	} catch (e) {
		console.error(e)

		return []
	}
}
