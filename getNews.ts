import { encode } from "@toon-format/toon"
import { generateText, type LanguageModel, Output } from "ai"
import z from "zod"
import { getLatestNews } from "./turso/index.ts"
import type { NewsItem } from "./types.ts"

const RSS_MODEL: LanguageModel = "mistral/devstral-2"
const NEWS_MODEL: LanguageModel = "deepseek/deepseek-v3.2-thinking"

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

export async function getNews(rssList: string[]): Promise<NewsItem[]> {
	try {
		const rssResponsePromise = (rss: string) => async () => {
			const feedContent = await fetch(rss).then((res) => res.text())

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
						The response must be a list of news items, each containing a summary, the related images, and the link to the news article.
						The summary should be enough descriptive, between 200 and 250 words.
						The images should be proper image type format, from the respective related RSS feed.
						Avoid logo images, such as "https://www.aljazeera.com/images/logo_aje.png".
						If all content is unreachable, return an empty string.`,
					},
					{
						role: "user",
						content: `Deliver the latest 10 most important news.`,
					},
				],
			})

			return text
		}

		const responses: string[] = []

		for (const rss of rssList) {
			const rssResponse = await rssResponsePromise(rss)().catch((e) => {
				console.error(`Error processing RSS ${rss}:`, e)
			})

			if (rssResponse) {
				responses.push(rssResponse)
			}
		}

		const latestNews = await getLatestNews({ limit: 24 })

		const response = await generateText({
			model: NEWS_MODEL,
			output: Output.object({
				schema: z.object({
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
				}),
			}),
			messages: [
				{
					role: "system",
					content: `I am a news analyzer that delivers a list of articles analyzing news from different sources.
					The summary should be enough descriptive, between 100 and 300 words.
					Add the most relevant tags to each article, up to 5 tags. There are some general tags but you can add others: ${TAGS.join(", ")}.
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
