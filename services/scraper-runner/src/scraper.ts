import { exec } from "node:child_process";

function runCommand(
  command: string,
  timeoutMs = 120_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Bright Data scrape failed: ${error.message}\n${stderr || ""}`
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });
}

export async function scrapeUrl(url: string) {
  const output = await runCommand(
    `brightdata scrape ${JSON.stringify(url)}`
  );

  return {
    url,
    raw: output,
    scrapedAt: new Date().toISOString(),
  };
}