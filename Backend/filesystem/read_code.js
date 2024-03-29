const fs = require('fs');
const path = require('path');
const Config = require('./src/config');

/**
 * TODO: Replace this with `code2prompt` - https://github.com/mufeedvh/code2prompt
 */

class ReadCode {
  constructor(projectName) {
    const config = new Config();
    const projectPath = config.getProjectsDir();
    this.directoryPath = path.join(projectPath, projectName.toLowerCase().replace(/ /g, '-'));
  }

  readDirectory() {
    const filesList = [];
    fs.readdirSync(this.directoryPath, { withFileTypes: true }).forEach(entry => {
      if (entry.isFile()) {
        try {
          const filePath = path.join(this.directoryPath, entry.name);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          filesList.push({ filename: filePath, code: fileContent });
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    });
    return filesList;
  }

  codeSetToMarkdown() {
    const codeSet = this.readDirectory();
    let markdown = '';
    codeSet.forEach(code => {
      markdown += `### ${code.filename}:\n\n`;
      markdown += '```\n' + code.code + '\n```\n\n';
      markdown += '---\n\n';
    });
    return markdown;
  }
}

module.exports = ReadCode;
