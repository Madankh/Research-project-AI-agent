import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { LLM } from './llm.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'planner', 'prompt.hbs'), 'utf-8').trim();

class Planner {
  constructor(baseModel) {
    this.llm = new LLM(baseModel);
  }

  render(prompt) {
    const template = Handlebars.compile(PROMPT);
    return template({ prompt });
  }

  validateResponse(response) {
    return true;
  }

  parseResponse(response) {
    const result = {
      project: '',
      reply: '',
      focus: '',
      plans: {},
      summary: ''
    };

    let currentSection = null;
    let currentStep = null;

    for (const line of response.split('\n')) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('Project Name:')) {
        currentSection = 'project';
        result.project = trimmedLine.split(':', 2)[1].trim();
      } else if (trimmedLine.startsWith('Your Reply to the Human Prompter:')) {
        currentSection = 'reply';
        result.reply = trimmedLine.split(':', 2)[1].trim();
      } else if (trimmedLine.startsWith('Current Focus:')) {
        currentSection = 'focus';
        result.focus = trimmedLine.split(':', 2)[1].trim();
      } else if (trimmedLine.startsWith('Plan:')) {
        currentSection = 'plans';
      } else if (trimmedLine.startsWith('Summary:')) {
        currentSection = 'summary';
        result.summary = trimmedLine.split(':', 2)[1].trim();
      } else if (currentSection === 'reply') {
        result.reply += ' ' + trimmedLine;
      } else if (currentSection === 'focus') {
        result.focus += ' ' + trimmedLine;
      } else if (currentSection === 'plans') {
        if (trimmedLine.startsWith('- [ ] Step')) {
          currentStep = trimmedLine.split(':')[0].trim().split(' ').pop();
          result.plans[parseInt(currentStep)] = trimmedLine.split(':', 2)[1].trim();
        } else if (currentStep) {
          result.plans[parseInt(currentStep)] += ' ' + trimmedLine;
        }
      } else if (currentSection === 'summary') {
        result.summary += ' ' + trimmedLine.replace(/```/g, '');
      }
    }

    result.project = result.project.trim();
    result.reply = result.reply.trim();
    result.focus = result.focus.trim();
    result.summary = result.summary.trim();

    return result;
  }

  async execute(prompt) {
    const renderedPrompt = this.render(prompt);
    const response = await this.llm.inference(renderedPrompt);
    return response;
  }
}

export { Planner };