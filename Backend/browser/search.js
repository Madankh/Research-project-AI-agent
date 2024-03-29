const fetch = require('node-fetch');
const Config = require('./src/config');

class BingSearch {
  constructor() {
    this.config = new Config();
    this.bingApiKey = this.config.getBingApiKey();
    this.bingApiEndpoint = this.config.getBingApiEndpoint();
    this.queryResult = null;
  }

  async search(query) {
    const headers = { "Ocp-Apim-Subscription-Key": this.bingApiKey };
    const params = new URLSearchParams({ q: query, mkt: "en-US" });

    try {
      const response = await fetch(`${this.bingApiEndpoint}?${params.toString()}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.queryResult = await response.json();
      return this.queryResult;
    } catch (err) {
      return err;
    }
  }

  getFirstLink() {
    if (this.queryResult && this.queryResult.webPages && this.queryResult.webPages.value.length > 0) {
      return this.queryResult.webPages.value[0].url;
    } else {
      return null;
    }
  }
}

// Example usage:
// const bingSearch = new BingSearch();
// bingSearch.search("OpenAI")
//   .then(result => {
//     console.log(result);
//     const firstLink = bingSearch.getFirstLink();
//     console.log("First Link:", firstLink);
//   })
//   .catch(err => console.error(err));
