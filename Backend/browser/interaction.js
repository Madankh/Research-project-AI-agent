const { chromium } = require('playwright');
const os = require('os');
const path = require('path');
const time = require('time');

const Config = require('./src/config');
const AgentState = require('./src/state');
const LLM = require('./src/llm');

const promptTemplate = `
You are an agent controlling a browser. You are given:

	(1) an objective that you are trying to achieve
	(2) the URL of your current web page
	(3) a simplified text description of what's visible in the browser window (more on that below)

You can issue these commands:
	SCROLL UP - scroll up one page
	SCROLL DOWN - scroll down one page
	CLICK X - click on a given element. You can only click on links, buttons, and inputs!
	TYPE X "TEXT" - type the specified text into the input with id X
	TYPESUBMIT X "TEXT" - same as TYPE above, except then it presses ENTER to submit the form

The format of the browser content is highly simplified; all formatting elements are stripped.
Interactive elements such as links, inputs, buttons are represented like this:

		<link id=1>text</link>
		<button id=2>text</button>
		<input id=3>text</input>

Images are rendered as their alt text like this:

		<img id=4 alt=""/>

Based on your given objective, issue whatever command you believe will get you closest to achieving your goal.
You always start on Google; you should submit a search query to Google that will take you to the best page for
achieving your objective. And then interact with that page to achieve your objective.

If you find yourself on Google and there are no search results displayed yet, you should probably issue a command 
like "TYPESUBMIT 7 "search query"" to get to a more useful page.

Then, if you find yourself on a Google search results page, you might issue the command "CLICK 24" to click
on the first link in the search results. (If your previous command was a TYPESUBMIT your next command should
probably be a CLICK.)

Don't try to interact with elements that you can't see.

Here are some examples:

EXAMPLE 1:
==================================================
CURRENT BROWSER CONTENT:
------------------
<link id=1>About</link>
<link id=2>Store</link>
<link id=3>Gmail</link>
<link id=4>Images</link>
<link id=5>(Google apps)</link>
<link id=6>Sign in</link>
<img id=7 alt="(Google)"/>
<input id=8 alt="Search"></input>
<button id=9>(Search by voice)</button>
<button id=10>(Google Search)</button>
<button id=11>(I'm Feeling Lucky)</button>
<link id=12>Advertising</link>
<link id=13>Business</link>
<link id=14>How Search works</link>
<link id=15>Carbon neutral since 2007</link>
<link id=16>Privacy</link>
<link id=17>Terms</link>
<text id=18>Settings</text>
------------------
OBJECTIVE: Find a 2 bedroom house for sale in Anchorage AK for under $750k
CURRENT URL: https://www.google.com/
YOUR COMMAND: 
TYPESUBMIT 8 "anchorage redfin"
==================================================

EXAMPLE 2:
==================================================
CURRENT BROWSER CONTENT:
------------------
<link id=1>About</link>
<link id=2>Store</link>
<link id=3>Gmail</link>
<link id=4>Images</link>
<link id=5>(Google apps)</link>
<link id=6>Sign in</link>
<img id=7 alt="(Google)"/>
<input id=8 alt="Search"></input>
<button id=9>(Search by voice)</button>
<button id=10>(Google Search)</button>
<button id=11>(I'm Feeling Lucky)</button>
<link id=12>Advertising</link>
<link id=13>Business</link>
<link id=14>How Search works</link>
<link id=15>Carbon neutral since 2007</link>
<link id=16>Privacy</link>
<link id=17>Terms</link>
<text id=18>Settings</text>
------------------
OBJECTIVE: Make a reservation for 4 at Dorsia at 8pm
CURRENT URL: https://www.google.com/
YOUR COMMAND: 
TYPESUBMIT 8 "dorsia nyc opentable"
==================================================

EXAMPLE 3:
==================================================
CURRENT BROWSER CONTENT:
------------------
<button id=1>For Businesses</button>
<button id=2>Mobile</button>
<button id=3>Help</button>
<button id=4 alt="Language Picker">EN</button>
<link id=5>OpenTable logo</link>
<button id=6 alt ="search">Search</button>
<text id=7>Find your table for any occasion</text>
<button id=8>(Date selector)</button>
<text id=9>Sep 28, 2022</text>
<text id=10>7:00 PM</text>
<text id=11>2 people</text>
<input id=12 alt="Location, Restaurant, or Cuisine"></input> 
<button id=13>Let's go</button>
<text id=14>It looks like you're in Peninsula. Not correct?</text> 
<button id=15>Get current location</button>
<button id=16>Next</button>
------------------
OBJECTIVE: Make a reservation for 4 for dinner at Dorsia in New York City at 8pm
CURRENT URL: https://www.opentable.com/
YOUR COMMAND: 
TYPESUBMIT 12 "dorsia new york city"
==================================================

The current browser content, objective, and current URL follow. Reply with your next command to the browser.

CURRENT BROWSER CONTENT:
------------------
$browser_content
------------------

OBJECTIVE: $objective
CURRENT URL: $url
PREVIOUS COMMAND: $previous_command
YOUR COMMAND:
`;

const blackListedElements = new Set(['html', 'head', 'title', 'meta', 'iframe', 'body', 'script', 'style', 'path', 'svg', 'br', '::marker']);

class Crawler {
  constructor() {
    this.browser = chromium.launch({ headless: true });
    this.page = this.browser.newPage();
    this.page.setViewportSize({ width: 1280, height: 1080 });
  }

  async screenshot(projectName) {
    const screenshotsSavePath = Config.getScreenshotsDir();
    const pageMetadata = await this.page.evaluate(() => ({ url: document.location.href, title: document.title }));
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

  async goToPage(url) {
    await this.page.goto(url.includes('://') ? url : `http://${url}`);
    this.client = await this.page.context().newCDPSession(this.page);
    this.pageElementBuffer = {};
  }

  async scroll(direction) {
    if (direction === 'up') {
      await this.page.evaluate(() => {
        (document.scrollingElement || document.body).scrollTop = (document.scrollingElement || document.body).scrollTop - window.innerHeight;
      });
    } else if (direction === 'down') {
      await this.page.evaluate(() => {
        (document.scrollingElement || document.body).scrollTop = (document.scrollingElement || document.body).scrollTop + window.innerHeight;
      });
    }
  }

  async click(id) {
    // Inject JavaScript to remove the target attribute from all links
    await this.page.evaluate(() => {
      const links = document.getElementsByTagName('a');
      for (let i = 0; i < links.length; i += 1) {
        links[i].removeAttribute('target');
      }
    });

    const element = this.pageElementBuffer[parseInt(id, 10)];
    if (element) {
      const { x, y } = element;
      await this.page.mouse.click(x, y);
    } else {
      console.log('Could not find element');
    }
  }

  async type(id, text) {
    await this.click(id);
    await this.page.keyboard.type(text);
  }

  async enter() {
    await this.page.keyboard.press('Enter');
  }

  async crawl() {
    const page = this.page;
    const pageElementBuffer = this.pageElementBuffer;
    const start = Date.now();

    const pageStateAsText = [];

    const devicePixelRatio = await page.evaluate('window.devicePixelRatio');
    const isMacOS = process.platform === 'darwin';
    const effectiveDevicePixelRatio = isMacOS && devicePixelRatio === 1 ? 2 : devicePixelRatio;

    const winScrollX = await page.evaluate('window.scrollX');
    const winScrollY = await page.evaluate('window.scrollY');
    const winUpperBound = await page.evaluate('window.pageYOffset');
    const winLeftBound = await page.evaluate('window.pageXOffset');
    const winWidth = await page.evaluate('window.screen.width');
    const winHeight = await page.evaluate('window.screen.height');
    const winRightBound = winLeftBound + winWidth;
    const winLowerBound = winUpperBound + winHeight;
    const documentOffsetHeight = await page.evaluate('document.body.offsetHeight');
    const documentScrollHeight = await page.evaluate('document.body.scrollHeight');

    const tree = await this.client.send('DOMSnapshot.captureSnapshot', {
      computedStyles: [],
      includeDOMRects: true,
      includePaintOrder: true,
    });

    const { strings } = tree;
    const document = tree.documents[0];
    const { nodes } = document;
    const { backendNodeId } = nodes;
    const { attributes } = nodes;
    const { nodeValue } = nodes;
    const { parentIndex: parent } = nodes;
    const { nodeType: nodeTypes } = nodes;
    const { nodeName: nodeNames } = nodes;
    const isClickable = new Set(nodes.isClickable.index);

    const { textValue } = nodes;
    const { index: textValueIndex } = textValue;
    const { value: textValueValues } = textValue;

    const { inputValue } = nodes;
    const { index: inputValueIndex } = inputValue;
    const { value: inputValueValues } = inputValue;

    const { inputChecked } = nodes;
    const { layout } = document;
    const { nodeIndex: layoutNodeIndex } = layout;
    const { bounds } = layout;

    let cursor = 0;
    const htmlElementsText = [];

    const childNodes = {};
    const elementsInViewPort = [];

    const ancestorExceptions = {
      a: { ancestry: { '-1': [false, null] }, nodes: {} },
      button: { ancestry: { '-1': [false, null] }, nodes: {} },
    };

    const convertName = (nodeName, isClickableElement) => {
      if (nodeName === 'a') return 'link';
      if (nodeName === 'input') return 'input';
      if (nodeName === 'img') return 'img';
      if (nodeName === 'button' || isClickableElement) return 'button';
      return 'text';
    };

    const findAttributes = (attributesArray, keys) => {
      const values = {};
      for (let i = 0; i < attributesArray.length; i += 2) {
        const keyIndex = attributesArray[i];
        const valueIndex = attributesArray[i + 1];
        if (valueIndex < 0) continue;
        const key = strings[keyIndex];
        const value = strings[valueIndex];
        if (keys.includes(key)) {
          values[key] = value;
          keys.splice(keys.indexOf(key), 1);
          if (keys.length === 0) return values;
        }
      }
      return values;
    };

    const addToHashTree = (hashTree, tag, nodeId, nodeName, parentId) => {
      const parentIdStr = parentId.toString();
      if (!hashTree[parentIdStr]) {
        const parentName = strings[nodeNames[parentId]].toLowerCase();
        const grandParentId = parent[parentId];
        addToHashTree(hashTree, tag, parentId, parentName, grandParentId);
      }
      const [isParentDescAnchor, anchorId] = hashTree[parentIdStr];
      const value = nodeName === tag ? [true, nodeId] : isParentDescAnchor ? [true, anchorId] : [false, null];
      hashTree[nodeId.toString()] = value;
      return value;
    };

    for (let index = 0; index < nodeNames.length; index += 1) {
      const nodeParent = parent[index];
      const nodeName = strings[nodeNames[index]].toLowerCase();

      for (const tag of Object.keys(ancestorExceptions)) {
        const isAncestorOfTag = addToHashTree(ancestorExceptions[tag].ancestry, tag, index, nodeName, nodeParent);
        ancestorExceptions[tag].nodes[index.toString()] = isAncestorOfTag;
      }

      try {
        cursor = layoutNodeIndex.indexOf(index);
      } catch (e) {
        continue;
      }

      if (blackListedElements.has(nodeName)) {
        continue;
      }

      const [x, y, width, height] = bounds[cursor];
      const scaledX = x / effectiveDevicePixelRatio;
      const scaledY = y / effectiveDevicePixelRatio;
      const scaledWidth = width / effectiveDevicePixelRatio;
      const scaledHeight = height / effectiveDevicePixelRatio;

      const elemLeftBound = scaledX;
      const elemTopBound = scaledY;
      const elemRightBound = scaledX + scaledWidth;
      const elemLowerBound = scaledY + scaledHeight;

      const partiallyIsInViewport =
        elemLeftBound < winRightBound &&
        elemRightBound >= winLeftBound &&
        elemTopBound < winLowerBound &&
        elemLowerBound >= winUpperBound;

      if (!partiallyIsInViewport) {
        continue;
      }

      const metaData = [];

      const elementAttributes = findAttributes(
        attributes[index],
        ['type', 'placeholder', 'aria-label', 'title', 'alt']
      );

      const ancestorException = Object.fromEntries(
        Object.entries(ancestorExceptions).map(([tag, { nodes }]) => [tag, nodes[index.toString()] || [false, null]])
      );

      const [isAncestorOfAnchor, anchorId] = ancestorException.a;
      const [isAncestorOfButton, buttonId] = ancestorException.button;
      const ancestorNodeKey = isAncestorOfAnchor ? anchorId.toString() : isAncestorOfButton ? buttonId.toString() : null;
      const ancestorNode = ancestorNodeKey ? childNodes[ancestorNodeKey] || (childNodes[ancestorNodeKey] = []) : null;

      if (nodeName === '#text' && ancestorNode) {
        const text = strings[nodeValue[index]];
        if (text === '•' || text === '|') {
          continue;
        }
        ancestorNode.push({ type: 'text', value: text });
      } else {
        if ((nodeName === 'input' && elementAttributes.get('type') === 'submit') || nodeName === 'button') {
          nodeName = 'button';
          elementAttributes.delete('type');
        }

        for (const [key, value] of Object.entries(elementAttributes)) {
          if (ancestorNode) {
            ancestorNode.push({ type: 'attribute', key, value });
          } else {
            metaData.push(value);
          }
        }
      }

      let elementNodeValue = null;
      if (nodeValue[index] >= 0) {
        elementNodeValue = strings[nodeValue[index]];
        if (elementNodeValue === '|') {
          continue;
        }
      } else if (nodeName === 'input' && inputValueIndex.includes(index)) {
        const inputTextIndex = inputValueIndex.indexOf(index);
        const textIndex = inputValueValues[inputTextIndex];
        if (textIndex >= 0) {
          elementNodeValue = strings[textIndex];
        }
      }

      if ((isAncestorOfAnchor || isAncestorOfButton) && (nodeName !== 'a' && nodeName !== 'button')) {
        continue;
      }

      elementsInViewPort.push({
        nodeIndex: index.toString(),
        backendNodeId: backendNodeId[index],
        nodeName,
        nodeValue: elementNodeValue,
        nodeMeta: metaData,
        isClickable: isClickable.has(index),
        originX: Math.round(scaledX),
        originY: Math.round(scaledY),
        centerX: Math.round(scaledX + scaledWidth / 2),
        centerY: Math.round(scaledY + scaledHeight / 2),
      });
    }

    const elementsOfInterest = [];
    let idCounter = 0;

    for (const element of elementsInViewPort) {
      const {
        nodeIndex,
        nodeName,
        nodeValue,
        isClickable,
        nodeMeta,
      } = element;

      let innerText = nodeValue ? `${nodeValue} ` : '';
      let meta = '';

      if (childNodes[nodeIndex]) {
        for (const child of childNodes[nodeIndex]) {
          const { type, value, key } = child;
          if (type === 'attribute') {
            meta += ` ${key}="${value}"`;
          } else {
            innerText += `${value} `;
          }
        }
      }

      if (nodeMeta.length > 0) {
        meta = ` ${nodeMeta.join(' ')}`;
      }
      innerText = innerText.trim();

      const shouldIncludeElement =
        innerText !== '' ||
        ['link', 'input', 'img', 'button', 'textarea'].includes(nodeName) ||
        (nodeName === 'button' && meta !== '');
      if (!shouldIncludeElement) {
        continue;
      }

      pageElementBuffer[idCounter] = element;

      const elementString = `<${convertName(nodeName, isClickable)} id=${idCounter}${meta}>` +
        (innerText ? `${innerText}</${convertName(nodeName, isClickable)}>` : '/>');
      elementsOfInterest.push(elementString);

      idCounter += 1;
    }

    console.log(`Parsing time: ${(Date.now() - start) / 1000} seconds`);
    return elementsOfInterest;
  }
}

async function startInteraction(modelId, objective, projectName) {
  const _crawler = new Crawler();

  const printHelp = () => {
    console.log(
      '(g) to visit url\n(u) scroll up\n(d) scroll down\n(c) to click\n(t) to type\n' +
      '(h) to view commands again\n(r/enter) to run suggested command\n(o) change objective'
    );
  };

  const getGptCommand = async (objective, url, previousCommand, browserContent) => {
    const prompt = promptTemplate
      .replace('$objective', objective)
      .replace('$url', url.slice(0, 100))
      .replace('$previous_command', previousCommand)
      .replace('$browser_content', browserContent.slice(0, 4500));
    const response = await LLM.inference(modelId, prompt);
    return response;
  };

  const runCmd = async (cmd) => {
    const [command, ...args] = cmd.split('\n')[0].split(' ');

    if (command === 'SCROLL') {
      await _crawler.scroll(args[0].toLowerCase());
    } else if (command === 'CLICK') {
      await _crawler.click(args[0]);
    } else if (command === 'TYPE') {
      const text = args.slice(2).join(' ').slice(1, -1);
      await _crawler.type(args[1], text);
      if (command === 'TYPESUBMIT') {
        await _crawler.enter();
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  let gptCmd = '';
  let prevCmd = '';
  await _crawler.goToPage('google.com');

  try {
    let visits = 0;

    while (visits < 5) {
      const browserContent = (_crawler.crawl() || []).join('\n');
      prevCmd = gptCmd;

      const currentUrl = _crawler.page.url();

      await _crawler.screenshot(projectName);

      gptCmd = (await getGptCommand(objective, currentUrl, prevCmd, browserContent)).trim();
      await runCmd(gptCmd);

      visits += 1;
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'Ctrl+C detected') {
      console.log('\n[!] Ctrl+C detected, exiting gracefully.');
      process.exit(0);
    }
    throw e;
  }
}

module.exports = {
  startInteraction,
};