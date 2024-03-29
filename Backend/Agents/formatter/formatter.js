import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'formatter', 'prompt.hbs'), 'utf-8').trim();

class Formatter {
  constructor(baseModel) {
    this.llm = new LLM(baseModel);
  }

  render(rawText) {
    const template = Handlebars.compile(PROMPT);
    return template({ raw_text: rawText });
  }

  validateResponse(response) {
    return true;
  }

  async execute(rawText) {
    const prompt = this.render(rawText);
    const response = await this.llm.inference(prompt);
    return response;
  }
}

export { Formatter };