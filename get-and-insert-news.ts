import { getNews } from "./getNews.ts"
import { insertNews } from "./turso/index.ts"

const items = await getNews()

console.table(items)

const res = await insertNews(items)

if (res?.itemsInserted) {
	console.log(`${res.itemsInserted} items inserted in DB`)
}
