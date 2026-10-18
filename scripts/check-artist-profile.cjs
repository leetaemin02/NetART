const assert = require('node:assert/strict');
const { saveArtist } = require('../api/artist-profile.cjs');

async function check() {
  let update;
  const collection = {
    updateOne: async (_filter, operation) => { update = operation; },
    findOne: async () => ({ name: 'Hồng Ngọc' })
  };
  const db = { collection: name => {
    assert.equal(name, 'artist_profile');
    return collection;
  } };

  await saveArtist(db, { name: 'Hồng Ngọc', artistName: 'Ruby' });
  assert.equal(update.$set.name, 'Hồng Ngọc');
  assert.equal(update.$setOnInsert.name, undefined);
  assert.equal(update.$setOnInsert.createdAt instanceof Date, true);
  assert.equal(Object.keys(update.$set).some(key => Object.hasOwn(update.$setOnInsert, key)), false);

  await saveArtist(db, { biography: 'Tiểu sử' });
  assert.equal(update.$setOnInsert.name, 'Họa sĩ');
  assert.equal(update.$set.name, undefined);
  console.log('PASS: cập nhật hồ sơ có/không có tên không bị trùng $set và $setOnInsert.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
