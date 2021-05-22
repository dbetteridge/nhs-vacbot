import puppeteer from "puppeteer-core";
import toad from "toad-scheduler";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { readFile } from "fs/promises";

dotenv.config({ path: ".env" });

const { ToadScheduler, SimpleIntervalJob, AsyncTask } = toad;

const webhookURL = process.env.WEBHOOK_URL;
const nhsNumber = process.env.NHS_NUMBER;
const [day, month, year] = process.env.DOB.split("/");
const interval = process.env.INTERVAL;
const period = process.env.PERIOD;

if (!nhsNumber) {
  throw new Error("NHS Number is required");
}

const date = Date.parse(process.env.DOB);

if (isNaN(date)) {
  throw new Error("Valid DOB is required");
}

const content = await readFile("./content.json").then((data) =>
  JSON.parse(data.toString())
);

const positiveContent = {
  username: content.username,
  avatar_url: content.avatar_url,
  content: content.positive,
};

const negativeContent = {
  username: content.username,
  avatar_url: content.avatar_url,
  content: content.negative,
};

const callWebhook = async (url, done = false) => {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: !done
      ? JSON.stringify(negativeContent)
      : JSON.stringify(positiveContent),
  })
    .then((response) => response)
    .catch((err) => {
      throw new Error(err);
    });
};

const checkTheApp = async () => {
  // run in a non-headless mode
  const browser = await puppeteer.launch({
    headless: true,
    // slows down Puppeteer operations
    slowMo: 100,
    // open dev tools
    devtools: true,
    executablePath: "/usr/bin/chromium-browser",
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1199, height: 900 });
  const link =
    "https://www.nhs.uk/book-a-coronavirus-vaccination/do-you-have-an-nhs-number";
  await page.goto(link);

  try {
    await page.waitForSelector("#option_Yes_input", { timeout: 300000 });
    await page.click("#option_Yes_input");
    await page.click("#submit-button");

    await page.waitForSelector('input[name="NhsNumber"]');
    await page.click('input[name="NhsNumber"]');
    await page.type('input[name="NhsNumber"]', nhsNumber);
    await page.click("#submit-button");

    await page.waitForSelector("#Date_Day");
    await page.type("#Date_Day", day);
    await page.type("#Date_Month", month);
    await page.type("#Date_Year", year);
    await page.click("#submit-button");

    try {
      await page.waitForSelector("#option_HealthWorker_input");
      console.log("Not yet");
      if (webhookURL) {
        await callWebhook(webhookURL);
      }
      return;
    } catch (err) {
      console.log("GOGO");
      if (webhookURL) {
        await callWebhook(webhookURL, true);
      }
      process.exit(0);
    }
  } catch (err) {
    await page.waitForSelector("#queuePosition");
    let element = await page.$("#queuePosition");
    let value = await page.evaluate((el) => el.textContent, element);
    console.error("You're probably in a queue, number: ", value);
    return;
  }
};

const scheduler = new ToadScheduler();

const task = new AsyncTask(
  "Check Every N Hours",
  () => {
    return checkTheApp();
  },
  (err) => {
    console.log("Something went wrong", err);
  }
);

const job = new SimpleIntervalJob({ [period]: interval }, task);

scheduler.addSimpleIntervalJob(job);

process.on("SIGINT", function () {
  console.log("Caught interrupt signal");

  scheduler.stop();
  process.exit();
});
