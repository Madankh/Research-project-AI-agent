const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb').ObjectId;
const { datetime } = require('datetime');
const fs = require('fs');
const path = require('path');

const Config = require('./config');

class Projects {
  constructor() {
    const config = new Config();
    this.mongoUri = config.getMongoUri();
    this.projectPath = config.getProjectsDir();
  }

  async connect() {
    this.client = new MongoClient(this.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await this.client.connect();
    this.db = this.client.db();
  }

  async disconnect() {
    await this.client.close();
  }

  newMessage() {
    const timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S');
    return {
      from_devika: true,
      message: null,
      timestamp: timestamp
    };
  }

  async createProject(project) {
    await this.connect();
    await this.db.collection('projects').insertOne({ project: project, message_stack_json: '[]' });
    await this.disconnect();
  }

  async deleteProject(project) {
    await this.connect();
    await this.db.collection('projects').deleteOne({ project: project });
    await this.disconnect();
  }

  async addMessageToProject(project, message) {
    await this.connect();
    await this.db.collection('projects').updateOne(
      { project: project },
      { $push: { message_stack_json: message } }
    );
    await this.disconnect();
  }

  async addMessageFromDevika(project, message) {
    const newMessage = this.newMessage();
    newMessage.message = message;
    await this.addMessageToProject(project, newMessage);
  }

  async addMessageFromUser(project, message) {
    const newMessage = this.newMessage();
    newMessage.message = message;
    newMessage.from_devika = false;
    await this.addMessageToProject(project, newMessage);
  }

  async getMessages(project) {
    await this.connect();
    const result = await this.db.collection('projects').findOne({ project: project });
    await this.disconnect();
    return result ? result.message_stack_json : null;
  }

  async getLatestMessageFromUser(project) {
    const messages = await this.getMessages(project);
    if (messages) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (!messages[i].from_devika) {
          return messages[i];
        }
      }
    }
    return null;
  }

  async validateLastMessageIsFromUser(project) {
    const messages = await this.getMessages(project);
    return messages && messages.length > 0 ? !messages[messages.length - 1].from_devika : false;
  }

  async getLatestMessageFromDevika(project) {
    const messages = await this.getMessages(project);
    if (messages) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].from_devika) {
          return messages[i];
        }
      }
    }
    return null;
  }

  async getProjectList() {
    await this.connect();
    const result = await this.db.collection('projects').find({}, { project: 1 }).toArray();
    await this.disconnect();
    return result ? result.map(item => item.project) : [];
  }

  getProjectPath(project) {
    return path.join(this.projectPath, project.toLowerCase().replace(/ /g, '-'));
  }

  async projectToZip(project) {
    const projectPath = this.getProjectPath(project);
    const zipPath = `${projectPath}.zip`;

    const zipf = new JSZip();
    const addFilesToZip = async (root, folder) => {
      const files = await fs.promises.readdir(root, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(root, file.name);
        const relativePath = path.relative(folder, filePath);
        if (file.isDirectory()) {
          await addFilesToZip(filePath, folder);
        } else {
          const data = await fs.promises.readFile(filePath);
          zipf.file(relativePath, data);
        }
      }
    };
    await addFilesToZip(projectPath, projectPath);

    const content = await zipf.generateAsync({ type: 'nodebuffer' });
    await fs.promises.writeFile(zipPath, content);
    return zipPath;
  }

  getZipPath(project) {
    return `${this.getProjectPath(project)}.zip`;
  }
}

module.exports = Projects;
