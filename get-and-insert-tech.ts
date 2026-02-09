import { getNews } from "./getNews.ts"
import { insertNews } from "./turso/index.ts"

const TECH_RSS_LIST = [
	"https://feeds.bbci.co.uk/news/technology/rss.xml",
	"https://www.theguardian.com/uk/technology/rss",
	"https://www.wired.com/feed/rss",
	"https://www.techradar.com/rss",
	"https://www.theverge.com/rss/index.xml",
	"https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
	"https://www.cnet.com/rss/news/",
]

const items = await getNews(TECH_RSS_LIST)

const res = await insertNews(items)

if (res?.itemsInserted) {
	console.log(`${res.itemsInserted} items from tech RSS feeds inserted in DB`)
}
