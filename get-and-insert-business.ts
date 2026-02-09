import { getNews } from "./getNews.ts"
import { insertNews } from "./turso/index.ts"

const BUSINESS_RSS_LIST = [
	"http://feeds2.feedburner.com/businessinsider",
	"https://www.theguardian.com/uk/business/rss",
	"https://fortune.com/feed/fortune-feeds/?id=3230629",
	"https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
	"https://www.bbc.co.uk/news/business/rss.xml",
	"https://www.cnbc.com/id/10001147/device/rss/rss.html",
	"http://feeds.harvardbusiness.org/harvardbusiness/",
]

const items = await getNews(BUSINESS_RSS_LIST)

const res = await insertNews(items)

if (res?.itemsInserted) {
	console.log(
		`${res.itemsInserted} items from business RSS feeds inserted in DB`,
	)
}
