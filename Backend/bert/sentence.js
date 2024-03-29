// Import the hypothetical keyword extraction library
const { myKeywordExtractor } = require('my-keyword-extractor');

class SentenceBert {
  constructor(sentence) {
    this.sentence = sentence;
    this.kwModel = new myKeywordExtractor();
  }

  async extractKeywords(topN = 5) {
    try {
      const keywords = await this.kwModel.extractKeywords({
        text: this.sentence,
        ngramRange: [1, 1],
        stopWords: 'english',
        topN,
        useMMR: true,
        diversity: 0.7,
      });
      return keywords;
    } catch (error) {
      throw new Error('Error extracting keywords: ' + error.message);
    }
  }
}

module.exports = SentenceBert;
