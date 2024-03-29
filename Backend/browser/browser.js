const { chromium } = require('playwright');
const { markdownify } = require('markdownify');
const { extractText } = require('pdf-parse');
const Config = require('./src/config');
const AgentState = require('./src/state');

class Browser {
  constructor() {
    this.playwright = chromium.launch();
    this.browser = this.playwright.newBrowser();
    this.page = this.browser.newPage();
  }

  newPage() {
    return this.browser.newPage();
  }

  async goTo(url) {
    await this.page.goto(url);
  }

  async screenshot(projectName) {
    const screenshotsSavePath = Config.getScreenshotsDir();
    const pageMetadata = await this.page.evaluate(() => {
      return { url: document.location.href, title: document.title };
    });
    const pageUrl = pageMetadata.url;
    const randomFilename = crypto.randomBytes(20).toString('hex');
    const filenameToSave = `${randomFilename}.png`;
    const pathToSave = path.join(screenshotsSavePath, filenameToSave);
    await this.page.emulateMedia({ media: 'screen' });
    await this.page.screenshot({ path: pathToSave });
    const newState = AgentState.newState();
    newState.internalMonologue = 'Browsing the web right now...';
    newState.browserSession = { url: pageUrl, screenshot: pathToSave };
    AgentState.addToCurrentState(projectName, newState);
    return pathToSave;
  }

  async getHtml() {
    return await this.page.content();
  }

  async getMarkdown() {
    const html = await this.page.content();
    return markdownify(html);
  }

  async getPdf() {
    const pdfsSavePath = Config.getPdfsDir();
    const pageMetadata = await this.page.evaluate(() => {
      return { url: document.location.href, title: document.title };
    });
    const filenameToSave = `${pageMetadata.title}.pdf`;
    const savePath = path.join(pdfsSavePath, filenameToSave);
    await this.page.pdf({ path: savePath });
    return savePath;
  }

  async pdfToText(pdfPath) {
    const pdfData = await extractText(pdfPath);
    return pdfData.trim();
  }

  async getContent() {
    const pdfPath = await this.getPdf();
    return await this.pdfToText(pdfPath);
  }

  async extractText() {
    return await this.page.evaluate(() => document.body.innerText);
  }

  async close() {
    await this.page.close();
    await this.browser.close();
    await this.playwright.close();
  }
}

module.exports = Browser;