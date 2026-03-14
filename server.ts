// import { serve } from "@hono/node-server"
// import { serveStatic } from "@hono/node-server/serve-static"
// import { Hono } from "hono"

// const app = new Hono()

// app.use("*", serveStatic({ root: "./static" }))

// app.get("/", (c) => c.text("Hello Node.js!"))

// serve(
// 	{
// 		fetch: app.fetch,
// 		port: 0,
// 	},
// 	async ({ port }) => {
// 		console.log("Serving in port: ", port)
// 	},
// )
