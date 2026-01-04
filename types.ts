export interface NewsItem {
	title: string
	summary: string
	urls: { link: string; source: string }[]
	images: { link: string; source: string }[]
}
