import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.notion.so/2cb55bd4a536805e9c8ddf416e9bdd26');

        // Wait for content to load
        await page.waitForSelector('.notion-page-content', { timeout: 10000 }).catch(() => console.log('Timeout waiting for selector, proceeding anyway...'));

        const content = await page.evaluate(() => {
            return document.body.innerText;
        });

        fs.writeFileSync('notion_content.txt', content);
        console.log('Successfully saved content to notion_content.txt');

        await browser.close();
    } catch (error) {
        console.error('Error:', error);
    }
})();
