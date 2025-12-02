import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

type Comment = {
  id: number;
  author: string;
  body: string;
  post_slug: string;
};

const renderComment = (comment: Comment) => html`
  <p>
    <strong>${comment.author}</strong>
    <br />
    ${comment.body}
  </p>
`;

const index = (slug: string, comments: Comment[]) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="/main.css" />
    </head>

    <body>
      <input type="text" placeholder="Your Name" />
      <textarea placeholder="Leave a comment"></textarea>
      <button type="submit">Submit</button>

      ${comments.map(renderComment)}

      <script>
        const authorField = document.querySelector("input");
        const bodyField = document.querySelector("textarea");
        const submit = document.querySelector("button[type=submit]");

        submit.addEventListener("click", async () => {
          if (
            authorField.value.match(/^\\s*$/) ||
            bodyField.value.match(/^\\s*$/)
          ) {
            return;
          }

          await fetch("/postComment/${slug}", {
            method: "POST",
            body: JSON.stringify({
              author: authorField.value,
              body: bodyField.value,
            }),
          });

          authorField.value = "";
          bodyField.value = "";
          window.location.reload();
        });
      </script>
    </body>
  </html>
`;

async function getComments(slug: string): Promise<Comment[]> {
  const query = env.database
    .prepare(`SELECT * FROM Comments WHERE post_slug = ?`)
    .bind(slug);
  const { results } = await query.run();
  return results as Comment[];
}

async function postComment(author: string, body: string, slug: string) {
  const query = env.database
    .prepare(`INSERT INTO Comments (author, body, post_slug) VALUES (?, ?, ?)`)
    .bind(author, body, slug);
  await query.run();

  await fetch(env.WEBHOOK_URL + "?with_components=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      components: [
        {
          type: 10,
          content: `New comment on ${slug}`,
        },
        {
          type: 17,
          accent_color: 14483615,
          spoiler: false,
          components: [
            {
              type: 10,
              content: `## ${author}`,
            },
            {
              type: 10,
              content: body,
            },
          ],
        },
      ],
      flags: 1 << 15,
    }),
  });
}

app.get("/comments/:slug", async (c) => {
  const { slug } = c.req.param();
  const comments = await getComments(slug);
  return c.html(index(slug, comments));
});

app.post("/postComment/:slug", async (c) => {
  const { slug } = c.req.param();
  const { author, body } = await c.req.json();
  await postComment(author, body, slug);
  return c.text("OK");
});

export default app;
