export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Pool } from "pg";


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 500 }
      );
    }

    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.url,
        s."collectorId",
        s."createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', sn.id,
              'status', sn.status,
              'changeStatus', sn."changeStatus",
              'fetchedAt', sn."fetchedAt",
              'contentHash', sn."contentHash",
              'data', sn.data
            )
            ORDER BY sn."fetchedAt" DESC
          ) FILTER (WHERE sn.id IS NOT NULL),
          '[]'::json
        ) AS snapshots
      FROM "Site" s
      LEFT JOIN "Snapshot" sn
        ON sn."siteId" = s.id
      GROUP BY
        s.id,
        s.name,
        s.url,
        s."collectorId",
        s."createdAt"
      ORDER BY s."createdAt" DESC;
    `);

    return NextResponse.json(result.rows, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load Watchtower sites:", error);

    return NextResponse.json(
      {
        error: "Failed to load Watchtower data",
      },
      { status: 500 }
    );
  }
}