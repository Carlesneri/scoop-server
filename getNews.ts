import { encode } from "@toon-format/toon"
import { type GatewayModelId, generateText, Output } from "ai"

import z from "zod"
import { getLatestNews } from "./turso/index.ts"
import type { NewsItem } from "./types.ts"
import { gateway, shuffleRssList } from "./utils.ts"

const RSS_MODEL: GatewayModelId = "amazon/nova-lite"
const NEWS_MODEL: GatewayModelId = "deepseek/deepseek-v3.2-thinking"
const TESTING = false

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

const READ_LABEL_TIME = "Analyze RSS news"
const WRITE_LABEL_TIME = "Generate articles"

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
	const shuffledRssList = shuffleRssList(rssList)

	console.info({ RSS_MODEL, NEWS_MODEL, shuffledRssList })

	try {
		const rssResponsePromise = (rss: string) => async () => {
			const feedContent = await fetch(rss)
				.then((res) => res.text())
				.catch((e) => {
					console.error(`Error fetching RSS ${rss}:`, e)
				})

			if (!feedContent) {
				return null
			}

			const splittedContent = feedContent.split(" ")

			const slicedContent = splittedContent.slice(0, 30000).join(" ")

			const { text } = await generateText({
				model: gateway.chat(RSS_MODEL),
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
						content: `Deliver the latest, at most 7, most important news.`,
					},
				],
			})

			return text
		}

		console.time(READ_LABEL_TIME)

		const responses: string[] = []

		for (const rss of shuffledRssList) {
			const rssResponse = await rssResponsePromise(rss)().catch((e) => {
				console.error(`Error processing RSS ${rss}:`, e)
			})

			if (rssResponse) {
				responses.push(rssResponse)
			}
		}

		console.timeEnd(READ_LABEL_TIME)

		if (TESTING) {
			console.log({ responses })
		}

		const latestNews = TESTING ? [] : await getLatestNews({ limit: 24 })

		console.time(WRITE_LABEL_TIME)

		const response = await generateText({
			model: gateway.chat(NEWS_MODEL),
			output: Output.object({
				schema: newsSchema,
			}),
			messages: [
				{
					role: "system",
					content: `I am a jounalist that delivers a list of opinion articles analyzing news from different sources.
					My opinion stems from a perspective that is favorable to human rights and environmentalism, and critical of capitalism.
					My articles highlight the funny or ironic part of the story, if there is any, or comment on it sarcastically, but without straying from the truth.
					I do not mention explicitly my personal opinions, such as to be against capitalism.
					I like to make funny or absurds comparisons.
					Specific data provided, like names, dates, etc., are veridic, either are omited.
					Each article refers to a all news about same information, and groups all the information from all sources.
					The title of each article should be a concise and catchy headline, that refears to the main or the most interesting point of the article, always specific, with no generalities, no more than 20 words long. Try to avoid punctuaction marks like colon (:).
					The summary is the content of the article, which should be enough descriptive and specific, with the most relevant information included, with no generalities, between 150 and 500 words.
					The urls are the corresponding links to each media outlet.
					The images should be proper image type format, from the respective related RSS feeds.
					Most relevant tags to each article are added, up to 5 tags. There are some general tags but you can add others: ${TAGS.join(", ")}.
					Response meet the interface of this example: "${encode(JSON.stringify(newsExample))}".
					`,
				},
				{
					role: "user",
					content: `Analyze <sources>"${encode(responses)}"<sources> and deliver the latest most important articles.
					Check <latest-news>"${encode(latestNews)}"<latest-news> so you do not include news that are already included.
					You can use Markdown format to structure the content of the summary, using paragraphs, lists, and other formatting elements to make it more readable and engaging.
					`,
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

		if (TESTING) {
			console.log({ finalItems })
		}

		return TESTING ? [] : finalItems
	} catch (e) {
		console.error(e)

		return []
	}
}
