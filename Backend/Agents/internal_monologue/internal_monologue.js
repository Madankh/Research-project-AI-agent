import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'internal_monologue', 'prompt.hbs'), 'utf-8').trim();

class InternalMonologue {
  constructor(baseModel) {
    this.llm = new LLM(baseModel);
  }

  render(currentPrompt) {
    const template = Handlebars.compile(PROMPT);
    return template({ current_prompt: currentPrompt });
  }

  validateResponse(response) {
    response = response.trim().replace(/```json/g, '```');
    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    try {
      const parsedResponse = JSON.parse(response);
      const cleanedResponse = Object.fromEntries(
        Object.entries(parsedResponse).map(([key, value]) => [key.replace(/\\+/g, ''), value])
      );

      if ('internal_monologue' in cleanedResponse) {
        return cleanedResponse.internal_monologue;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  async execute(currentPrompt) {
    const prompt = this.render(currentPrompt);
    let response = await this.llm.inference(prompt);
    let validResponse = this.validateResponse(response);

    while (!validResponse) {
      console.log('Invalid response from the model, trying again...');
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    return validResponse;
  }
}

export { InternalMonologue };