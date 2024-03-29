const mongoose = require('mongoose');
const { Schema } = mongoose;
const Config = require('./src/config');

// Define the AgentStateModel schema
const agentStateSchema = new Schema({
  project: String,
  stateStackJson: String,
});

// Create the AgentStateModel model
const AgentStateModel = mongoose.model('AgentState', agentStateSchema);

class AgentState {
  constructor() {
    const config = new Config();
    const mongoUrl = config.getMongoUrl(); // Assuming you have a method to get the MongoDB URL
    mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  new_state() {
    const timestamp = new Date().toISOString();
    return {
      internal_monologue: null,
      browser_session: { url: null, screenshot: null },
      terminal_session: { command: null, output: null, title: null },
      step: null,
      message: null,
      completed: false,
      agent_is_active: true,
      token_usage: 0,
      timestamp: timestamp,
    };
  }

  async delete_state(project) {
    await AgentStateModel.findOneAndDelete({ project: project });
  }

  async add_to_current_state(project, state) {
    let agentState = await AgentStateModel.findOne({ project: project });
    if (agentState) {
      const stateStack = JSON.parse(agentState.stateStackJson);
      stateStack.push(state);
      agentState.stateStackJson = JSON.stringify(stateStack);
      await agentState.save();
    } else {
      agentState = new AgentStateModel({ project: project, stateStackJson: JSON.stringify([state]) });
      await agentState.save();
    }
  }

  async get_current_state(project) {
    const agentState = await AgentStateModel.findOne({ project: project });
    return agentState ? JSON.parse(agentState.stateStackJson) : null;
  }

  async update_latest_state(project, state) {
    let agentState = await AgentStateModel.findOne({ project: project });
    if (agentState) {
      const stateStack = JSON.parse(agentState.stateStackJson);
      stateStack[stateStack.length - 1] = state;
      agentState.stateStackJson = JSON.stringify(stateStack);
      await agentState.save();
    } else {
      agentState = new AgentStateModel({ project: project, stateStackJson: JSON.stringify([state]) });
      await agentState.save();
    }
  }

  async get_latest_state(project) {
    const agentState = await AgentStateModel.findOne({ project: project });
    const stateStack = agentState ? JSON.parse(agentState.stateStackJson) : [];
    return stateStack.length > 0 ? stateStack[stateStack.length - 1] : null;
  }

  async set_agent_active(project, is_active) {
    let agentState = await AgentStateModel.findOne({ project: project });
    if (agentState) {
      const stateStack = JSON.parse(agentState.stateStackJson);
      stateStack[stateStack.length - 1].agent_is_active = is_active;
      agentState.stateStackJson = JSON.stringify(stateStack);
      await agentState.save();
    } else {
      agentState = new AgentStateModel({
        project: project,
        stateStackJson: JSON.stringify([this.new_state()]),
      });
      agentState.stateStackJson.agent_is_active = is_active;
      await agentState.save();
    }
  }

  async is_agent_active(project) {
    const agentState = await AgentStateModel.findOne({ project: project });
    const stateStack = agentState ? JSON.parse(agentState.stateStackJson) : [];
    return stateStack.length > 0 ? stateStack[stateStack.length - 1].agent_is_active : null;
  }

  async set_agent_completed(project, is_completed) {
    let agentState = await AgentStateModel.findOne({ project: project });
    if (agentState) {
      const stateStack = JSON.parse(agentState.stateStackJson);
      stateStack[stateStack.length - 1].completed = is_completed;
      agentState.stateStackJson = JSON.stringify(stateStack);
      await agentState.save();
    } else {
      agentState = new AgentStateModel({
        project: project,
        stateStackJson: JSON.stringify([this.new_state()]),
      });
      agentState.stateStackJson.completed = is_completed;
      await agentState.save();
    }
  }

  async is_agent_completed(project) {
    const agentState = await AgentStateModel.findOne({ project: project });
    const stateStack = agentState ? JSON.parse(agentState.stateStackJson) : [];
    return stateStack.length > 0 ? stateStack[stateStack.length - 1].completed : null;
  }
}

module.exports = AgentState;
