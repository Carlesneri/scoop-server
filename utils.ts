export function responseCleaner(content: string) {
	return content.replace(/(^```json|\n|```$)/g, "")
}
