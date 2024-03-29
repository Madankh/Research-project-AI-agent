const fs = require('fs');
const toml = require('@iarna/toml');

class Config {
    constructor() {
        this.config = toml.parse(fs.readFileSync('config.toml', 'utf8'));
    }

    getConfig() {
        return this.config;
    }

    getBingApiKey() {
        return this.config.API_KEYS.BING;
    }

    getBingApiEndpoint() {
        return this.config.API_ENDPOINTS.BING;
    }

    getClaudeApiKey() {
        return this.config.API_KEYS.CLAUDE;
    }

    getOpenaiApiKey() {
        return this.config.API_KEYS.OPENAI;
    }

    getNetlifyApiKey() {
        return this.config.API_KEYS.NETLIFY;
    }

    getSqliteDb() {
        return this.config.STORAGE.SQLITE_DB;
    }

    getScreenshotsDir() {
        return this.config.STORAGE.SCREENSHOTS_DIR;
    }

    getPdfsDir() {
        return this.config.STORAGE.PDFS_DIR;
    }

    getProjectsDir() {
        return this.config.STORAGE.PROJECTS_DIR;
    }

    getLogsDir() {
        return this.config.STORAGE.LOGS_DIR;
    }

    getReposDir() {
        return this.config.STORAGE.REPOS_DIR;
    }

    setBingApiKey(key) {
        this.config.API_KEYS.BING = key;
        this.saveConfig();
    }

    setBingApiEndpoint(endpoint) {
        this.config.API_ENDPOINTS.BING = endpoint;
        this.saveConfig();
    }

    setClaudeApiKey(key) {
        this.config.API_KEYS.CLAUDE = key;
        this.saveConfig();
    }

    setOpenaiApiKey(key) {
        this.config.API_KEYS.OPENAI = key;
        this.saveConfig();
    }

    setNetlifyApiKey(key) {
        this.config.API_KEYS.NETLIFY = key;
        this.saveConfig();
    }

    // setSqliteDb(db) {
    //     this.config.STORAGE.SQLITE_DB = db;
    //     this.saveConfig();
    // }

    setScreenshotsDir(dir) {
        this.config.STORAGE.SCREENSHOTS_DIR = dir;
        this.saveConfig();
    }

    setPdfsDir(dir) {
        this.config.STORAGE.PDFS_DIR = dir;
        this.saveConfig();
    }

    setProjectsDir(dir) {
        this.config.STORAGE.PROJECTS_DIR = dir;
        this.saveConfig();
    }

    setLogsDir(dir) {
        this.config.STORAGE.LOGS_DIR = dir;
        this.saveConfig();
    }

    setReposDir(dir) {
        this.config.STORAGE.REPOS_DIR = dir;
        this.saveConfig();
    }

    saveConfig() {
        fs.writeFileSync('config.toml', toml.stringify(this.config));
    }
}

module.exports = Config;
