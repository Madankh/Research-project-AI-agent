// Importing required modules
const Ollama = require('./ollama_client');
const Claude = require('./claude_client');
const OpenAI = require('./openai_client');
const AgentState = require('./src/state');
const tiktoken = require('tiktoken');

// Global variables
let TOKEN_USAGE = 0;
const TIKTOKEN_ENC = tiktoken.get_encoding("cl100k_base");

// Defining the Model enum
const Model = {
  CLAUDE_3_OPUS: ["Claude 3 Opus", "claude-3-opus-20240229"],
  CLAUDE_3_SONNET: ["Claude 3 Sonnet", "claude-3-sonnet-20240229"],
  CLAUDE_3_HAIKU: ["Claude 3 Haiku", "claude-3-haiku-20240307"],
  GPT_4_TURBO: ["GPT-4 Turbo", "gpt-4-0125-preview"],
  GPT_3_5: ["GPT-3.5", "gpt-3.5-turbo-0125"],
  OLLAMA_MODELS: [
    ...Ollama.list_models().map(model => [
      model.name,
      `${model.details.parameter_size} - ${model.details.quantization_level}`,
    ])
  ],
};

// Defining the LLM class
class LLM {
  constructor(modelId = null) {
    this.modelId = modelId;
  }

  list_models() {
    return Object.values(Model)
      .filter(model => model !== Model.OLLAMA_MODELS)
      .map(model => model[0])
      .concat(Model.OLLAMA_MODELS.map(model => model[0]));
  }

  model_id_to_enum_mapping() {
    const models = Object.fromEntries(
      Object.entries(Model)
        .filter(([key, value]) => key !== 'OLLAMA_MODELS')
        .map(([key, value]) => [value[1], key])
    );
    const ollamaModels = Object.fromEntries(
      Model.OLLAMA_MODELS.map(model => [model[1], 'OLLAMA_MODELS'])
    );
    return Object.assign(models, ollamaModels);
  }

  update_global_token_usage(string) {
    TOKEN_USAGE += Buffer.byteLength(TIKTOKEN_ENC.encode(string), 'utf-8');
    console.log(`Token usage: ${TOKEN_USAGE}`);
  }

  inference(prompt) {
    this.update_global_token_usage(prompt);
    
    const model = this.model_id_to_enum_mapping()[this.modelId];
    
    if (model === 'OLLAMA_MODELS') {
      const response = Ollama().inference(this.modelId, prompt).trim();
      this.update_global_token_usage(response);
      return response;
    } else if (model.includes('CLAUDE')) {
      const response = Claude().inference(this.modelId, prompt).trim();
      this.update_global_token_usage(response);
      return response;
    } else if (model.includes('GPT')) {
      const response = OpenAI().inference(this.modelId, prompt).trim();
      this.update_global_token_usage(response);
      return response;
    } else {
      throw new Error(`Model ${model} not supported`);
    }
  }
}

module.exports = LLM;
