import { getNews } from "./getNews.ts"
import { insertNews } from "./turso/index.ts"

const GENERAL_RSS_LIST = [
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

const items = await getNews(GENERAL_RSS_LIST)

const res = await insertNews(items)

if (res?.itemsInserted) {
	console.log(
		`${res.itemsInserted} items from general RSS feeds inserted in DB`,
	)
}
