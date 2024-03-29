const { Anthropic } = require('@anthropic/sdk');
const Config = require('./src/config');

class Claude {
  constructor() {
    const config = new Config();
    const apiKey = config.getClaudeApiKey();
    this.client = new Anthropic(apiKey);
  }

  async inference(modelId, prompt) {
    const response = await this.client.completions.create({
      model: modelId,
      prompt: prompt.trim(),
      maxTokensToSample: 4096,
    });

    return response.completionResult.result;
  }
}

module.exports = Claude;