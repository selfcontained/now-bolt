module.exports = app => {
  app.message(":wave:", async ({ message, say }) => {
    await say(`Hello, <@${message.user}>`);
  });
};
