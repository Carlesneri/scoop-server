import { getNews } from "./getNews.ts"
import { insertNews } from "./turso/index.ts"

const SPORTS_RSS_LIST = [
	"https://feeds.bbci.co.uk/news/rss.xml",
	"https://www.theguardian.com/uk/sport/rss",
	"https://www.espn.com/espn/rss/news",
	"https://feeds.bbci.co.uk/sport/formula1/rss.xml",
	"https://www.formula1.com/en/latest/all.xml",
	"https://www.dailymail.co.uk/sport/index.rss",
]

const items = await getNews(SPORTS_RSS_LIST)

const res = await insertNews(items)

if (res?.itemsInserted) {
	console.log(`${res.itemsInserted} items from sports RSS feeds inserted in DB`)
}
