const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const getAvailablePort = require('../src/utils/port');

test('returns a different port when the requested port is busy', async () => {
  const occupiedServer = net.createServer();

  await new Promise((resolve, reject) => {
    occupiedServer.once('error', reject);
    occupiedServer.listen(0, '::', resolve);
  });

  const address = occupiedServer.address();
  const availablePort = await getAvailablePort(address.port, 3);

  assert.notStrictEqual(availablePort, address.port);

  await new Promise((resolve, reject) => {
    occupiedServer.close((error) => (error ? reject(error) : resolve()));
  });
});

test('accepts string-based port values from the environment', async () => {
  const availablePort = await getAvailablePort('8000', 2);

  assert.ok(availablePort >= 8000);
  assert.ok(availablePort <= 8002);
});
