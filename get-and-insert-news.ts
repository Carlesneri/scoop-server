import { getNews } from "./index.ts"
import { insertNews } from "./turso/index.ts"

const items = await getNews()

insertNews(items)
