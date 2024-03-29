import fs from 'fs';
import { resolve } from 'path';
import Handlebars from 'handlebars';
import { Config } from './config.js';
import { LLM } from './llm.js';
import { AgentState } from './state.js';

const PROMPT = fs.readFileSync(resolve('src', 'agents', 'feature', 'prompt.hbs'), 'utf-8').trim();

class Feature {
  constructor(baseModel) {
    const config = new Config();
    this.projectDir = config.getProjectsDir();
    this.llm = new LLM(baseModel);
  }

  render(conversation, codeMarkdown, systemOS) {
    const env = new Handlebars.SafeString(Environment, BaseLoader);
    const template = env.from_string(PROMPT);
    return template.render({ conversation, code_markdown: codeMarkdown, system_os: systemOS });
  }

  validateResponse(response) {
    response = response.trim();

    response = response.split("~~~", 2)[1];
    response = response.slice(0, response.lastIndexOf("~~~")).trim();

    const result = [];
    let currentFile = null;
    let currentCode = [];
    let codeBlock = false;

    for (const line of response.split("\n")) {
      if (line.startsWith("File: ")) {
        if (currentFile && currentCode.length) {
          result.push({ file: currentFile, code: currentCode.join("\n") });
        }
        currentFile = line.split("`")[1].trim();
        currentCode = [];
        codeBlock = false;
      } else if (line.startsWith("```")) {
        codeBlock = !codeBlock;
      } else if (codeBlock) {
        currentCode.push(line);
      }
    }

    if (currentFile && currentCode.length) {
      result.push({ file: currentFile, code: currentCode.join("\n") });
    }

    return result;
  }

  saveCodeToProject(response, projectName) {
    let filePathDir = null;
    const projectNameFormatted = projectName.toLowerCase().replace(/\s+/g, '-');

    for (const file of response) {
      const filePath = `${this.projectDir}/${projectNameFormatted}/${file.file}`;
      filePathDir = filePath.slice(0, filePath.lastIndexOf('/'));
      fs.mkdirSync(filePathDir, { recursive: true });
      fs.writeFileSync(filePath, file.code);
    }

    return filePathDir;
  }

  getProjectPath(projectName) {
    const projectNameFormatted = projectName.toLowerCase().replace(/\s+/g, '-');
    return `${this.projectDir}/${projectNameFormatted}`;
  }

  responseToMarkdownPrompt(response) {
    const formattedResponse = response.map(file => `File: \`${file.file}\`:\n\`\`\`\n${file.code}\n\`\`\``).join('\n');
    return `~~~\n${formattedResponse}\n~~~`;
  }

  emulateCodeWriting(codeSet, projectName) {
    for (const file of codeSet) {
      const { file: fileName, code } = file;

      const newState = new AgentState().newState();
      newState.internal_monologue = "Writing code...";
      newState.terminal_session.title = `Editing ${fileName}`;
      newState.terminal_session.command = `vim ${fileName}`;
      newState.terminal_session.output = code;
      new AgentState().addToCurrentState(projectName, newState);
      sleep(1000);
    }
  }

  async execute(conversation, codeMarkdown, systemOS, projectName) {
    const prompt = this.render(conversation, codeMarkdown, systemOS);
    let response = await this.llm.inference(prompt);

    let validResponse = this.validateResponse(response);

    while (!validResponse.length) {
      console.log("Invalid response from the model, trying again...");
      response = await this.llm.inference(prompt);
      validResponse = this.validateResponse(response);
    }

    this.emulateCodeWriting(validResponse, projectName);

    return validResponse;
  }
}

export { Feature };
