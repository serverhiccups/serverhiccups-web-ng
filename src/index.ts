import * as dotenv from "dotenv";
dotenv.config();
import koa from "koa";
import Router from "koa-router";
import serve from "koa-static";
import path from "path";
import views from "koa-views";
import { graphql } from "@octokit/graphql";
import uEmojiParser from "universal-emoji-parser";

const app = new koa();

const render = views(path.resolve('./views'), {
	map: {
		html: "ejs"
	}
})

app.use(render);

const { user } = await graphql(
	`
	query {
		user(login:"serverhiccups") {
			pinnedItems(first: 6, types: [REPOSITORY, GIST]) {
				totalCount
				edges {
					node {
						... on Repository {
						name
						description
						url
						}
					}
				}
			}
		}
	}
	`,
	{
		headers: {
			authorization: `token ${process.env.GH_AUTH_TOKEN}`
		}
	}
)

const pinnedRepoes = user.pinnedItems.edges.map((item) => {
	return {
		name: item.node.name,
		description: item.node.description,
		url: item.node.url
	};
}).map((repo) => {
	return { ...repo, description: uEmojiParser.parse(repo.description) }
});

const pages = new Router();

pages.get("index.html", async (ctx, next) => {
	ctx.redirect("/");
})

pages.get("/", async (ctx, next) => {
	// @ts-ignore
	await ctx.render("index", {
		pinnedRepoes: pinnedRepoes
	});
})

app.use(pages.routes());
app.use(pages.allowedMethods());

app.use(serve(path.resolve("./public")));

app.listen(8888, "127.0.0.1")
