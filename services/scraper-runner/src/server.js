import express from "express";
import cors from "cors";
import { prisma } from "./db.js";
import { scrapeUrl } from "./scraper.js";
import { hashContent } from "./compare.js";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "scraper-runner",
    });
});
app.get("/sites", async (_req, res) => {
    try {
        const sites = await prisma.site.findMany({
            include: {
                snapshots: {
                    orderBy: {
                        fetchedAt: "desc",
                    },
                    take: 5,
                },
            },
        });
        res.json(sites);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to load sites",
        });
    }
});
app.post("/sites/:siteId/run", async (req, res) => {
    const { siteId } = req.params;
    const site = await prisma.site.findUnique({
        where: {
            id: siteId,
        },
    });
    if (!site) {
        res.status(404).json({
            error: "Site not found",
        });
        return;
    }
    try {
        console.log(`Starting scrape: ${site.url}`);
        const result = await scrapeUrl(site.url);
        const currentHash = hashContent(result.raw);
        const previousSnapshot = await prisma.snapshot.findFirst({
            where: {
                siteId: site.id,
                status: "ok",
            },
            orderBy: {
                fetchedAt: "desc",
            },
        });
        let changeStatus;
        if (!previousSnapshot || !previousSnapshot.contentHash) {
            changeStatus = "initial";
        }
        else if (previousSnapshot.contentHash === currentHash) {
            changeStatus = "unchanged";
        }
        else {
            changeStatus = "changed";
        }
        const snapshot = await prisma.snapshot.create({
            data: {
                siteId: site.id,
                data: result,
                status: "ok",
                contentHash: currentHash,
                changeStatus,
            },
        });
        console.log(`Scrape successful: ${snapshot.id} | ${changeStatus}`);
        res.json({
            success: true,
            changeStatus,
            snapshot,
        });
    }
    catch (error) {
        console.error("Scrape failed:", error);
        const snapshot = await prisma.snapshot.create({
            data: {
                siteId: site.id,
                data: {
                    error: error instanceof Error
                        ? error.message
                        : String(error),
                },
                status: "failed",
            },
        });
        res.status(500).json({
            success: false,
            snapshot,
        });
    }
});
app.post("/run-all", async (_req, res) => {
    try {
        const sites = await prisma.site.findMany();
        console.log(`Starting run for ${sites.length} site(s)`);
        const results = [];
        for (const site of sites) {
            console.log(`Starting scrape: ${site.url}`);
            try {
                const result = await scrapeUrl(site.url);
                const currentHash = hashContent(result.raw);
                const previousSnapshot = await prisma.snapshot.findFirst({
                    where: {
                        siteId: site.id,
                        status: "ok",
                    },
                    orderBy: {
                        fetchedAt: "desc",
                    },
                });
                let changeStatus;
                if (!previousSnapshot || !previousSnapshot.contentHash) {
                    changeStatus = "initial";
                }
                else if (previousSnapshot.contentHash === currentHash) {
                    changeStatus = "unchanged";
                }
                else {
                    changeStatus = "changed";
                }
                const snapshot = await prisma.snapshot.create({
                    data: {
                        siteId: site.id,
                        data: result,
                        status: "ok",
                        contentHash: currentHash,
                        changeStatus,
                    },
                });
                console.log(`Scrape successful: ${site.name} | ${changeStatus}`);
                results.push({
                    siteId: site.id,
                    siteName: site.name,
                    status: "ok",
                    changeStatus,
                    snapshotId: snapshot.id,
                });
            }
            catch (error) {
                console.error(`Scrape failed for ${site.name}:`, error);
                const snapshot = await prisma.snapshot.create({
                    data: {
                        siteId: site.id,
                        data: {
                            error: error instanceof Error
                                ? error.message
                                : String(error),
                        },
                        status: "failed",
                    },
                });
                results.push({
                    siteId: site.id,
                    siteName: site.name,
                    status: "failed",
                    changeStatus: null,
                    snapshotId: snapshot.id,
                });
            }
        }
        res.json({
            success: true,
            totalSites: sites.length,
            results,
        });
    }
    catch (error) {
        console.error("Run-all failed:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : String(error),
        });
    }
});
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
    console.log(`Scraper runner listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map