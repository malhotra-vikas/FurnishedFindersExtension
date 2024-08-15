const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Extensions only work in head-full mode.
    args: [
      `--disable-extensions-except=/Users/vikas/builderspace/VeraAI/Extension/`,
      `--load-extension=/Users/vikas/builderspace/VeraAI/Extension/`
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://www.cnn.com');

  // Wait for the page to load and select a predictable element
  await page.waitForSelector('h2');

  // Select some text: Let's assume we select the text inside the first <h2> tag
  await page.evaluate(() => {
    const text = document.querySelector('h2');
    if (text) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(text);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  // Simulate a right-click on the selected text
  await page.mouse.click(100, 200, { button: 'right' });

  // Add a delay so you can see the result before the browser closes
  await new Promise(resolve => setTimeout(resolve, 5000));

  await browser.close();
})();
