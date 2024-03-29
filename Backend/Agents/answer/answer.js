import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { Config } from './config.js';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'answer', 'prompt.hbs'), 'utf-8').trim();

class Answer {
  constructor(baseModel) {
    const config = new Config();
    this.projectDir = config.getProjectsDir();
    this.llm = new LLM(baseModel);
  }

  render(conversation, codeMarkdown) {
    const template = Handlebars.compile(PROMPT);
    return template({ conversation, code_markdown: codeMarkdown });
  }

  validateResponse(response) {
    response = response.trim().replace(/```json/g, '```');
    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    try {
      const parsedResponse = JSON.parse(response);
      if ('response' in parsedResponse) {
        return parsedResponse.response;
      }
    } catch (e) {
      return false;
    }

    return false;
  }

  async execute(conversation, codeMarkdown) {
    const prompt = this.render(conversation, codeMarkdown);
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

export { Answer };