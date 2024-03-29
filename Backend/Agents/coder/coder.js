import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { Config } from './config.js';
import { LLM } from './llm.js';
import { AgentState } from './state.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'coder', 'prompt.hbs'), 'utf-8').trim();

class Coder {
  constructor(baseModel) {
    const config = new Config();
    this.projectDir = config.getProjectsDir();
    this.llm = new LLM(baseModel);
  }

  render(stepByStepPlan, userContext, searchResults) {
    const template = Handlebars.compile(PROMPT);
    return template({ step_by_step_plan: stepByStepPlan, user_context: userContext, search_results: searchResults });
  }

  validateResponse(response) {
    response = response.trim();

    const [_, validResponse] = response.split('~~~', 2);
    const result = [];
    let currentFile = null;
    let currentCode = [];
    let codeBlock = false;

    for (const line of validResponse.slice(0, validResponse.lastIndexOf('~~~')).trim().split('\n')) {
      if (line.startsWith('File: ')) {
        if (currentFile && currentCode.length) {
          result.push({ file: currentFile, code: currentCode.join('\n') });
        }
        currentFile = line.split('`')[1].trim();
        currentCode = [];
        codeBlock = false;
      } else if (line.startsWith('```')) {
        codeBlock = !codeBlock;
      } else if (codeBlock) {
        currentCode.push(line);
      }
    }

    if (currentFile && currentCode.length) {
      result.push({ file: currentFile, code: currentCode.join('\n') });
    }

    return result;
  }

  saveCodeToProject(response, projectName) {
    const projectNameFormatted = projectName.toLowerCase().replace(/\s+/g, '-');
    const filePathDir = response.reduce((dirPath, file) => {
      const filePath = path.join(this.projectDir, projectNameFormatted, file.file);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, file.code);
      return dir;
    }, null);

    return filePathDir;
  }

  getProjectPath(projectName) {
    const projectNameFormatted = projectName.toLowerCase().replace(/\s+/g, '-');
    return path.join(this.projectDir, projectNameFormatted);
  }

  responseToMarkdownPrompt(response) {
    const formattedResponse = response.map(file => `File: \`${file.file}\`:\n\`\`\`\n${file.code}\n\`\`\``).join('\n');
    return `~~~\n${formattedResponse}\n~~~`;
  }

  async emulateCodeWriting(codeSet, projectName) {
    const agentState = new AgentState();
    for (const currentFile of codeSet) {
      const { file, code } = currentFile;
      const currentState = agentState.getLatestState(projectName);
      const newState = agentState.newState();
      newState.browser_session = currentState.browser_session;
      newState.internal_monologue = 'Writing code...';
      newState.terminal_session.title = `Editing ${file}`;
      newState.terminal_session.command = `vim ${file}`;
      newState.terminal_session.output = code;
      agentState.addToCurrentState(projectName, newState);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  

  async execute(stepByStepPlan, userContext, searchResults, projectName) {
    const prompt = this.render(stepByStepPlan, userContext, searchResults);
    let response = await this.llm.inference(prompt);

    let validResponse = this.validateResponse(response);

    while (!validResponse.length) {
      console.log('Invalid response from the model, trying again...');
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    console.log(validResponse);

    this.emulateCodeWriting(validResponse, projectName);

    return validResponse;
  }
}

export { Coder };