import Handlebars from 'handlebars';
import { LLM } from './llm.js';
import { BingSearch } from './browser/search.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'researcher', 'prompt.hbs'), 'utf-8').trim();

class Researcher {
  constructor(baseModel) {
    this.bingSearch = new BingSearch();
    this.llm = new LLM(baseModel);
  }

  render(stepByStepPlan, contextualKeywords) {
    const template = Handlebars.compile(PROMPT);
    return template({ step_by_step_plan: stepByStepPlan, contextual_keywords: contextualKeywords });
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

      if ('queries' in cleanedResponse && 'ask_user' in cleanedResponse) {
        return {
          queries: cleanedResponse.queries,
          ask_user: cleanedResponse.ask_user
        };
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  execute(stepByStepPlan, contextualKeywords) {
    const capitalizedKeywords = contextualKeywords.map(k => k.capitalize()).join(', ');
    const prompt = this.render(stepByStepPlan, capitalizedKeywords);
    const response = this.llm.inference(prompt);
    let validResponse = this.validateResponse(response);

    while (!validResponse) {
      console.log('Invalid response from the model, trying again...');
      validResponse = this.execute(stepByStepPlan, contextualKeywords);
    }

    return validResponse;
  }
}

export { Researcher };