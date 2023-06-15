// Module imports
const puppeteer = require('puppeteer');

// Defined globals
const OP_LIST_URL =
  'https://gamepress.gg/arknights/tools/interactive-operator-list#tags=null##stats';

// Create and invoke anonymous function
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto(OP_LIST_URL);

  const operatorElements = await page.$$('.operator-cell');

  const operators = [];

  // DEBUG
  let count = 1;

  for (const element of operatorElements) {
    // Build an operator object from data in each operator cell element
    const operator = {};

    // DEBUG
    console.log(
      'Fetching basic data for element %d of %d',
      count,
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

    // DEBUG
    count++;
  }

  // DEBUG
  count = 1;

  // Fetch the birthdays which involves navigating to each individual operator page and scraping for the birthday part of the table
  for (const operator of operators) {
    try {
      // DEBUG
      console.log(
        'Fetching birthday info for %s [%d of %d]...',
        operator.name,
        count,
        operators.length
      );

      // Navigate to profile
      await page.goto(operator.profileURL);

      // Scrape for the teable header that contains "Birthday" and return the value of the data cell next to it, given by its next sibling.
      operator.birthday = await page.$eval(
        'th::-p-text("Birthday")',
        (bdHeader) => bdHeader.nextElementSibling.innerText
      );
    } catch (err) {
      console.error('Birthday for %s not obtained', operator.name);
      console.error(err);
      operator.birthday = null;
    } finally {
      // DEBUG
      count++;
    }
  }

  // TEST: Print out all operator fields
  operators.map((operator) =>
    console.log(
      'Operator: %s, Birthday: %s, Icon Path: %s',
      operator.name,
      operator.birthday,
      operator.iconURL
    )
  );

  await browser.close();
})();
