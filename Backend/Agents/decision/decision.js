import fs from 'fs';
import { resolve } from 'path';
import Handlebars from 'handlebars';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync(resolve('src', 'agents', 'decision', 'prompt.jinja2'), 'utf-8').trim();

class Decision {
  constructor(baseModel) {
    this.llm = new LLM(baseModel);
  }

  render(prompt) {
    const template = Handlebars.compile(PROMPT);
    return template({ prompt });
  }

  validateResponse(response) {
    response = response.trim().replace("```json", "```");
        
    if (response.startsWith("```") && response.endsWith("```")) {
      response = response.slice(3, -3).trim();
    }

    try {
      response = JSON.parse(response);
    } catch (error) {
      return false;
    }

    for (const item of response) {
      if (!('function' in item) || !('args' in item) || !('reply' in item)) {
        return false;
      }
    }

    return response;
  }

  async execute(prompt) {
    prompt = this.render(prompt);
    let response = await this.llm.inference(prompt);
    let validResponse = this.validateResponse(response);

    while (!validResponse) {
      console.log("Invalid response from the model, trying again...");
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    return validResponse;
  }
}

export { Decision };
