// Module imports
const puppeteer = require('puppeteer');

// Defined globals
const URL = 'https://www.helloworld.org/';

// Create and invoke anonymous function
// INITIAL COMMIT: Roundabout way to print "Hello World" with a headless browser.
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto(URL);

  const element = await page.waitForSelector('h1');
  const h1Text = await page.evaluate((element) => element.innerText, element);
  console.log(h1Text);

  await browser.close();
})();
