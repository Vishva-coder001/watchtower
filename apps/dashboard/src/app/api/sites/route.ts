import { NextResponse } from "next/server";

const SCRAPER_URL = "http://localhost:4000";

export async function GET() {
  try {
    const response = await fetch(`${SCRAPER_URL}/sites`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Scraper returned HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to connect to scraper runner:", error);

    return NextResponse.json(
      {
        error: "Scraper runner is unavailable",
      },
      { status: 503 }
    );
  }
}