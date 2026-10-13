import { connection } from "next/server";
import { APP_RELEASE } from "@/shared/release/version";

export async function GET() {
  await connection();
  return Response.json(
    { version: APP_RELEASE },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    },
  );
}
