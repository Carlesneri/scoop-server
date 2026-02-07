import fs from "node:fs"
import path from "node:path"
import { loadEnvFile } from "node:process"

const envPath = path.resolve(process.cwd(), ".env")

if (fs.existsSync(envPath)) {
	loadEnvFile(envPath)
}

export const {
	OPENAI_API_KEY,
	TURSO_DATABASE_URL,
	TURSO_AUTH_TOKEN,
	DEEPSEEK_API_KEY,
} = process.env
