const OpenAI = require('openai');
const Config = require('./src/config');

class OpenAIHandler {
  constructor(apiKey) {
    const config = new Config();
    const apiKey = config.getOpenAIApiKey();
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async inference(modelId, prompt) {
    try {
      const chatCompletion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
        model: modelId,
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error('Error in OpenAI inference:', error);
      throw error;
    }
  }
}

module.exports = OpenAIHandler;
