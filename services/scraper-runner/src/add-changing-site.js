import { prisma } from "./db.js";
async function main() {
    const site = await prisma.site.create({
        data: {
            name: "Changing Test",
            collectorId: "changing-test",
            url: "https://httpbin.org/uuid",
        },
    });
    console.log("Changing test site created:");
    console.log(site);
}
main()
    .catch((error) => {
    console.error("Failed to create changing test site:");
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=add-changing-site.js.map