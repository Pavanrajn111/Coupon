const assert = require("assert");
const test = require("node:test");
const detailsDb = require("../src/db/detailsDb");

test("updateUserProfile updates profile details and rejects duplicate usernames", () => {
  detailsDb.initDetailsDb();

  const suffix = Date.now();
  const userId = detailsDb.createUser({
    fullName: "Temp User",
    username: `tempuser${suffix}`,
    email: `tempuser${suffix}@example.com`,
    phoneNumber: "9999999999",
    password: "hashedpassword",
  });

  const updated = detailsDb.updateUserProfile(userId, {
    fullName: "Updated Name",
    username: "updateduser123",
    phoneNumber: "1111111111",
    bio: "Fresh profile bio",
    profilePhoto: "data:image/png;base64,abc",
  });

  assert.strictEqual(updated.success, true);

  const refreshed = detailsDb.findUserByUsername("updateduser123");
  assert.ok(refreshed);
  assert.strictEqual(refreshed.fullName, "Updated Name");
  assert.strictEqual(refreshed.phoneNumber, "1111111111");
  assert.strictEqual(refreshed.bio, "Fresh profile bio");
  assert.strictEqual(refreshed.profilePhoto, "data:image/png;base64,abc");

  const duplicate = detailsDb.updateUserProfile(userId, {
    fullName: "Still Updated",
    username: "demo",
    phoneNumber: "1111111111",
  });

  assert.strictEqual(duplicate.success, false);
  assert.ok(duplicate.errors && duplicate.errors.username);
});
