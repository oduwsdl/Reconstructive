const Reconstructive = require('./reconstructive');

rc = new Reconstructive();

test('Initializes Reconstructive', () => {
  expect(rc.id).toBe(`${rc.NAME}:${rc.VERSION}`);
});
