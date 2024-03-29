import fs from 'fs';
import Handlebars from 'handlebars';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync('src/agents/reporter/prompt.hbs', 'utf-8').trim();

class Reporter {
  constructor(baseModel) {
    this.llm = new LLM({ model_id: baseModel });
  }

  render(conversation, codeMarkdown) {
    const template = Handlebars.compile(PROMPT);
    return template({ conversation, code_markdown: codeMarkdown });
  }

  validateResponse(response) {
    response = response.trim().replace(/```md/g, '```');
    
    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    return response;
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

export { Reporter };
