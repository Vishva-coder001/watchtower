import { prisma } from "./db.js";

async function main() {
  const sites = await prisma.site.findMany();

  console.log("Database connection successful.");
  console.log(`Sites found: ${sites.length}`);
}

main()
  .catch((error) => {
    console.error("Database connection failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
