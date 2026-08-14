const net = require("node:net");

async function getAvailablePort(startPort, maxAttempts = 10) {
  const normalizedPort = Number.parseInt(startPort, 10);

  if (
    Number.isNaN(normalizedPort) ||
    normalizedPort < 0 ||
    normalizedPort > 65535
  ) {
    throw new Error(`Invalid port: ${startPort}`);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = normalizedPort + attempt;
    const isAvailable = await new Promise((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, "::");
    });

    if (isAvailable) {
      return port;
    }
  }

  throw new Error(
    `Unable to find an available port after ${maxAttempts} attempts`,
  );
}

module.exports = getAvailablePort;
