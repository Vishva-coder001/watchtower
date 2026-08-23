import { exec } from "node:child_process";
function runCommand(command, timeoutMs = 120_000) {
    return new Promise((resolve, reject) => {
        exec(command, {
            timeout: timeoutMs,
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
        }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Bright Data scrape failed: ${error.message}\n${stderr || ""}`));
                return;
            }
            resolve(stdout);
        });
    });
}
export async function scrapeUrl(url) {
    const output = await runCommand(`brightdata scrape ${JSON.stringify(url)}`);
    return {
        url,
        raw: output,
        scrapedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=scraper.js.map