import { Planner } from './planner.js';
import { Researcher } from './researcher.js';
import { Formatter } from './formatter.js';
import { Coder } from './coder.js';
import { Action } from './action.js';
import { InternalMonologue } from './internal_monologue.js';
import { Answer } from './answer.js';
import { Runner } from './runner.js';
import { Feature } from './feature.js';
import { Patcher } from './patcher.js';
import { Reporter } from './reporter.js';
import { Decision } from './decision.js';

import { Logger } from './logger.js';
import { ProjectManager } from './project.js';
import { AgentState } from './state.js';

import { SentenceBert } from './bert/sentence.js';
import { KnowledgeBase } from './memory.js';
import { BingSearch } from './browser/search.js';
import { Browser, startInteraction } from './browser.js';
import { ReadCode } from './filesystem.js';
import { Netlify } from './services.js';
import { PDF } from './documenter/pdf.js';

import json from 'json';
import time from 'time';
import platform from 'platform';
import tiktoken from 'tiktoken';


// import { Logger } from './logger.js';
// import { Planner } from './planner.js';
// import { Researcher } from './researcher.js';
// import { Formatter } from './formatter.js';
// import { Coder } from './coder.js';
// import { Action } from './action.js';
// import { InternalMonologue } from './internal_monologue.js';
// import { Answer } from './answer.js';
// import { Runner } from './runner.js';
// import { Feature } from './feature.js';
// import { Patcher } from './patcher.js';
// import { Reporter } from './reporter.js';
// import { Decision } from './decision.js';

class Agent {
  constructor(baseModel) {
    if (!baseModel) {
      throw new Error("base_model is required");
    }

    this.logger = new Logger();

    this.collectedContextKeywords = new Set();

    this.planner = new Planner({ base_model: baseModel });
    this.researcher = new Researcher({ base_model: baseModel });
    this.formatter = new Formatter({ base_model: baseModel });
    this.coder = new Coder({ base_model: baseModel });
    this.action = new Action({ base_model: baseModel });
    this.internalMonologue = new InternalMonologue({ base_model: baseModel });
    this.answer = new Answer({ base_model: baseModel });
    this.runner = new Runner({ base_model: baseModel });
    this.feature = new Feature({ base_model: baseModel });
    this.patcher = new Patcher({ base_model: baseModel });
    this.reporter = new Reporter({ base_model: baseModel });
    this.decision = new Decision({ base_model: baseModel });

    this.tokenizer = tiktoken.get_encoding("cl100k_base");
    
  }
}

export { Agent };
