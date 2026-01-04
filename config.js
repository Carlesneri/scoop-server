import { loadEnvFile } from "node:process"

loadEnvFile()

const { OPENAI_API_KEY } = process.env

export { OPENAI_API_KEY }
