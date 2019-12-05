const Logger = require("@slack/logger");
const { getReceiver, createSlackApp } = require("../slackapp");

module.exports = (req, res) => {
  const logger = new Logger.ConsoleLogger();

  const receiver = getReceiver({ logger });

  createSlackApp({ logger, receiver });

  receiver.handleRequest(req, res);
};
