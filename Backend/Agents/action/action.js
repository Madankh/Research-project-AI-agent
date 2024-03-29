import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../../config.js';
import { LLM } from '../../llm/llm.js';
import * as Handlebars from 'handlebars';
const PROMPT = fs.readFileSync(path.join('src', 'agents', 'action', 'prompt.jinja2'), 'utf-8').trim();

class Action {
  constructor(baseModel) {
    const config = new Config();
    this.projectDir = config.getProjectsDir();
    this.llm = new LLM(baseModel);
  }

  render(conversation) {
    const template = Handlebars.compile(PROMPT);
    return template({ conversation });
  }

  validateResponse(response) {
    response = response.trim().replace(/```json/g, '```');
    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    try {
      const parsedResponse = JSON.parse(response);
      if ('response' in parsedResponse && 'action' in parsedResponse) {
        return [parsedResponse.response, parsedResponse.action];
      }
    } catch (e) {
      return false;
    }

    return false;
  }

  async execute(conversation) {
    const prompt = this.render(conversation);
    let response = await this.llm.inference(prompt);
    let validResponse = this.validateResponse(response);

    while (!validResponse) {
      console.log('Invalid response from the model, trying again...');
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    console.log('===========');
    console.log(validResponse);
    return validResponse;
  }
}

export { Action };