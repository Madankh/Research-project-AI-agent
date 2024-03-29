// Importing ollama module
const ollama = require('ollama');

class Ollama {
  static list_models() {
    return ollama.list().models;
  }

  inference(modelId, prompt) {
    const response = ollama.generate({
      model: modelId,
      prompt: prompt.trim(),
    });

    return response.response;
  }
}

module.exports = Ollama;
