import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { eq } from "drizzle-orm";

await db
  .update(messages)
  .set({ status: "incomplete" })
  .where(eq(messages.status, "streaming"));
console.log("✅ cleared old streaming flags");
process.exit(0);
