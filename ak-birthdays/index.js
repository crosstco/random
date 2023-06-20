// Module imports
const puppeteer = require('puppeteer');
const async = require('async');
const fs = require('fs');
const { convertArrayToCSV } = require('convert-array-to-csv');

// Safe handling of puppeteer resources
// Creates a browser object and attempts to execute the function defined by fn with the new browser object. Disposes the browser on pass or failure to prevent hanging resources.
const useBrowser = async (fn) => {
  const browser = await puppeteer.launch({ headless: 'new ' });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
};

// Creates a page object given a browser and attempts to execute the function defined by fn with the new page object. Disposes the page on pass or failure to prevent hanging resources.
const usePage = async (browser, fn) => {
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};

// Defined globals
const OP_LIST_URL =
  'https://gamepress.gg/arknights/tools/interactive-operator-list#tags=null##stats'; // Gamepress link to list of operators.
const NUM_PARALLEL_PAGES = 5; // Number of pages to run concurrently
const operators = [];
let count = 0;

// Execution start: create a browser and use this for everything else.
(async () => {
  await useBrowser(async (browser) => {
    // Get basic operator data from the OP_LIST_URL (name, icon, and url to their page with more specific info)
    await usePage(browser, async (page) => {
      await page.goto(OP_LIST_URL);

      const operatorElements = await page.$$('.operator-cell');

      // DEBUG
      count = 1;

      // Grab all operator data on the page in parallel. NOTE: All basic data is on this page so all requests can be done at once.
      await async.each(operatorElements, async (element) => {
        const operator = {};

        // DEBUG
        console.log(
          'Fetching basic data for element %d of %d',
          count++,
          operatorElements.length
        );

        // Get operator name
        operator.name = await element.$eval(
          '.operator-title-actual',
          (titleElement) => {
            return titleElement.innerText;
          }
        );

        // Get operator image file
        operator.iconURL = await element.$eval('img[src]', (img) => {
          return img.getAttribute('src');
        });

        // Store profile URL which will be used for extra data later.
        const operatorPagePath = await element.$eval('a', (link) => {
          return link.getAttribute('href');
        });

        //Build URL to profile by taking the link and expanding it to the profile section
        operator.profileURL =
          'https://gamepress.gg' + operatorPagePath + '#profile';

        // Append operator data to operators array
        operators.push(operator);
      });
    });

    // DEBUG
    count = 1;
    await async.eachLimit(operators, NUM_PARALLEL_PAGES, async (operator) => {
      // DEBUG
      // if (count >= 25) break;

      // DEBUG
      console.log(
        'Fetching birthday info for %s [%d of %d]...',
        operator.name,
        count++,
        operators.length
      );

      // Attempt to navigate to the operator page and get the birthday info from the profile table.
      try {
        operator.birthday = await usePage(browser, async (page) => {
          await page.goto(operator.profileURL);

          return await page.$eval(
            'th::-p-text("Birthday")',
            (th) => th.nextElementSibling.innerText
          );
        });
      } catch (err) {
        console.log('FAILED to obtain birthday info for %s', operator.name);
        operator.birthday = null;
      }
    });
  });

  // Export operator data to CSV
  const operatorsCSV = convertArrayToCSV(operators);
  try {
    fs.writeFileSync('operators.csv', operatorsCSV);
  } catch (err) {
    console.error(err);
  }
})();
