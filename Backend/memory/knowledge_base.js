const { MongoClient } = require('mongodb');
const Config = require('./src/config');

class KnowledgeBase {
  constructor() {
    this.config = new Config();
    this.mongoUri = this.config.getMongoUri();
    this.mongoClient = new MongoClient(this.mongoUri);
    this.connect();
  }

  async connect() {
    try {
      await this.mongoClient.connect();
      console.log('Connected to MongoDB');
      this.db = this.mongoClient.db('knowledge_base');
      this.knowledgeCollection = this.db.collection('knowledge');
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
    }
  }

  async addKnowledge(tag, contents) {
    try {
      await this.knowledgeCollection.insertOne({ tag, contents });
    } catch (err) {
      console.error('Error adding knowledge:', err);
    }
  }

  async getKnowledge(tag) {
    try {
      const knowledge = await this.knowledgeCollection.findOne({ tag });
      return knowledge ? knowledge.contents : null;
    } catch (err) {
      console.error('Error getting knowledge:', err);
      return null;
    }
  }

  async close() {
    try {
      await this.mongoClient.close();
      console.log('Disconnected from MongoDB');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    }
  }
}

module.exports = KnowledgeBase;