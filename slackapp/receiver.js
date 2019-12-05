// this will become an easier to consume function/module
const {
  verifySignatureAndParseBody: createVerifySignatureAndParseBody
} = require("@slack/bolt/dist/ExpressReceiver");

exports.createReceiver = ({ logger, signingSecret }) => {
  let dispatchMessage = null;
  const errorCallbacks = [];

  // Trigger any error callbacks that were registered w/ our receiver
  const dispatchError = err => errorCallbacks.forEach(cb => cb(err));

  // We'll create this function to use when we handle the request
  const verifySignatureAndParseBody = createVerifySignatureAndParseBody(
    logger,
    signingSecret
  );

  // This gets called from our now function handler
  const handleRequest = async (req, res) => {
    // Respond to SSL Checks
    if (req.body && req.body.ssl_check) {
      res.status(200).send();
      return;
    }

    // Respond to URL Verification
    if (req.body && req.body.type && req.body.type === "url_verification") {
      res.status(200).json({ challenge: req.body.challenge });
      return;
    }

    await verifySignatureAndParseBody(req, null, error => {
      if (error) {
        dispatchError(error);
      }
    });

    // Ok, now we should have a parsed request body, let's build a message out of it
    logger.info(req.body);

    // This should never happen...
    if (!dispatchMessage) {
      return dispatchError(
        new Error(
          "No message event handler was registered, was this receiver setup with a bolt app?"
        )
      );
    }

    // Here we hand-off the message to @slack/bolt and wash our hands of this mess... mostly
    // @slack/bolt doesn't treat this message handling as completely async, but it could
    return await dispatchMessage({
      // Now parses the body for us, so we can just happily pass it along
      body: req.body,

      ack: ackResponse => {
        /**
         * Wait wut?  wut is this?
         * ✋🤚 - don't worry
         * ok, maybe worry a little
         * We're delaying our closing of the http response because @slack/bolt auto-acks certain events, which will close the http request
         * and subsequently
         */
        setTimeout(() => {
          if (!ackResponse) res.status(200).send("");
          if (typeof ackResponse === "string") {
            res.status(200).send(ackResponse);
          } else {
            res.status(200).json(ackResponse);
          }
        }, 2000);
      },
      respond: () => {
        logger.info("respond called");
      }
    });
  };

  // This is our interface to our @slack/bolt receiver
  return {
    // Process the incoming http request
    handleRequest,

    // There's nothing to really start here like a normal http server
    start: () => {},

    // You can't stop me.
    stop: () => {},

    // I present to you...
    // ... a very humble event emitter
    on: (event, cb) => {
      // @slack/bolt may register a few error publishers so we'll collect them in an array
      if (event === "error") {
        errorCallbacks.push(cb);
      }
      // We'll never be processing more than one message, so we can just store a reference to the handler
      if (event === "message") {
        dispatchMessage = cb;
      }
    }
  };
};
