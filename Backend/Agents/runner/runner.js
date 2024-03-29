import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { exec } from 'child_process';
import { Patcher } from './patcher.js';
import { LLM } from './llm.js';
import { AgentState } from './state.js';
import { ProjectManager } from './project.js';

const PROMPT = fs.readFileSync(path.join('src', 'agents', 'runner', 'prompt.hbs'), 'utf-8').trim();
const RERUNNER_PROMPT = fs.readFileSync(path.join('src', 'agents', 'runner', 'rerunner.hbs'), 'utf-8').trim();

class Runner {
  constructor(baseModel) {
    this.baseModel = baseModel;
    this.llm = new LLM(baseModel);
  }

  render(conversation, codeMarkdown, systemOs) {
    const template = Handlebars.compile(PROMPT);
    return template({ conversation, code_markdown: codeMarkdown, system_os: systemOs });
  }

  renderRerunner(conversation, codeMarkdown, systemOs, commands, error) {
    const template = Handlebars.compile(RERUNNER_PROMPT);
    return template({ conversation, code_markdown: codeMarkdown, system_os: systemOs, commands, error });
  }

  validateResponse(response) {
    response = response.trim().replace(/```json/g, '```');

    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    try {
      const parsedResponse = JSON.parse(response);
      if ('commands' in parsedResponse) {
        return parsedResponse.commands;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  validateRerunnerResponse(response) {
    response = response.trim().replace(/```json/g, '```');

    if (response.startsWith('```') && response.endsWith('```')) {
      response = response.slice(3, -3).trim();
    }

    console.log(response);

    try {
      const parsedResponse = JSON.parse(response);
      if ('action' in parsedResponse && 'response' in parsedResponse) {
        return parsedResponse;
      }
    } catch (error) {
      return false;
    }

    console.log(parsedResponse);
    return false;
  }

  async runCode(commands, projectPath, projectName, conversation, codeMarkdown, systemOs) {
    const retries = 2;
  
    for (const command of commands) {
      let retryCount = 0;
  
      while (retryCount < retries) {
        try {
          const commandOutput = await new Promise((resolve, reject) => {
            const commandSet = command.split(' ');
            exec(commandSet.join(' '), { cwd: projectPath }, (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                resolve(stdout.toString().trim());
              }
            });
          });
  
          const newState = new AgentState().newState();
          newState.internal_monologue = 'Running code...';
          newState.terminal_session.title = 'Terminal';
          newState.terminal_session.command = command;
          newState.terminal_session.output = commandOutput;
          AgentState().addToCurrentState(projectName, newState);
  
          // Wait for a delay before proceeding (if needed)
          await new Promise(resolve => setTimeout(resolve, 1000));
  
          break; // Break out of the retry loop if command succeeds
        } catch (error) {
          const newState = new AgentState().newState();
          newState.internal_monologue = 'Oh seems like there is some error... :(';
          newState.terminal_session.title = 'Terminal';
          newState.terminal_session.command = command;
          newState.terminal_session.output = error.message; // Or handle error message accordingly
          AgentState().addToCurrentState(projectName, newState);
  
          // Wait for a delay before proceeding (if needed)
          await new Promise(resolve => setTimeout(resolve, 1000));
  
          retryCount++;
        }
      }
    }
  }
  

  async execute(conversation, codeMarkdown, osSystem, projectPath, projectName) {
    const prompt = this.render(conversation, codeMarkdown, osSystem);
    let response = await this.llm.inference(prompt);

    let validResponse = this.validateResponse(response);

    while (!validResponse) {
      console.log('Invalid response from the model, trying again...');
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    console.log('==============================');
    console.log(validResponse);

    this.runCode(validResponse, projectPath, projectName, conversation, codeMarkdown, osSystem);

    return validResponse;
  }
}

export { Runner };