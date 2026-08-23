import { prisma } from "./db.js";
async function main() {
    const site = await prisma.site.create({
        data: {
            name: "Example",
            collectorId: "example-com",
            url: "https://example.com",
        },
    });
    console.log("Site created:");
    console.log(site);
}
main()
    .catch((error) => {
    console.error("Failed to create site:");
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=add-site.js.map