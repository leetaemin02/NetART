const { ObjectId } = require('mongodb');

const bad = message => { const err = new Error(message); err.status = 400; throw err; };
const fields = ['name', 'artistName', 'shortIntroduction', 'biography', 'specialties', 'location', 'contact', 'avatar', 'coverImage', 'galleryImages', 'featuredArtworkIds'];
const contactFields = ['phone', 'zaloUrl', 'facebookUrl', 'instagramUrl', 'email'];
const trim = (value, label, limit = 5000) => {
  if (typeof value !== 'string' || value.length > limit) bad(`${label} không hợp lệ`);
  return value.trim();
};
const url = (value, label) => {
  const str = trim(value, label, 2000);
  if (!str) return str;
  try { if (!['http:', 'https:'].includes(new URL(str).protocol)) bad(`${label} phải dùng HTTP/HTTPS`); }
  catch { bad(`${label} không phải URL hợp lệ`); }
  return str;
};
const image = (value, label) => {
  if (value == null) return { url: '', publicId: '' };
  if (typeof value !== 'object' || Array.isArray(value)) bad(`${label} không hợp lệ`);
  return { url: url(value.url || '', label), publicId: trim(value.publicId || '', label, 500) };
};

async function saveArtist(db, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Dữ liệu phải là JSON object');
  if (Object.keys(body).some(key => !fields.includes(key))) bad('Trường dữ liệu họa sĩ không được hỗ trợ');
  const data = {};
  for (const key of ['name', 'artistName', 'shortIntroduction', 'biography', 'location']) {
    if (Object.hasOwn(body, key)) data[key] = trim(body[key], key);
  }
  if (Object.hasOwn(body, 'name') && !data.name) bad('Tên họa sĩ không được để trống');
  if (Object.hasOwn(body, 'specialties')) {
    if (!Array.isArray(body.specialties) || body.specialties.length > 30) bad('Chuyên môn không hợp lệ');
    data.specialties = body.specialties.map(v => trim(v, 'Chuyên môn', 150)).filter(Boolean);
  }
  if (Object.hasOwn(body, 'contact')) {
    if (!body.contact || typeof body.contact !== 'object' || Array.isArray(body.contact) || Object.keys(body.contact).some(k => !contactFields.includes(k))) bad('Liên hệ không hợp lệ');
    data.contact = Object.fromEntries(contactFields.map(k => [k, k.endsWith('Url') ? url(body.contact[k] || '', k) : trim(body.contact[k] || '', k, 250)]));
  }
  for (const key of ['avatar', 'coverImage']) if (Object.hasOwn(body, key)) data[key] = image(body[key], key);
  if (Object.hasOwn(body, 'galleryImages')) {
    if (!Array.isArray(body.galleryImages) || body.galleryImages.length > 30) bad('Tối đa 30 ảnh giới thiệu');
    data.galleryImages = body.galleryImages.map((entry, index) => {
      const item = image(entry, `Ảnh số ${index + 1}`);
      if (!item.url) bad('Ảnh giới thiệu cần URL');
      return { ...item, alt: trim(entry.alt || '', 'Mô tả ảnh', 250), displayOrder: index + 1 };
    });
  }
  if (Object.hasOwn(body, 'featuredArtworkIds')) {
    if (!Array.isArray(body.featuredArtworkIds) || body.featuredArtworkIds.length > 100) bad('Danh sách tranh tiêu biểu không hợp lệ');
    const ids = body.featuredArtworkIds.map(id => {
      if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) bad('ID tranh không hợp lệ');
      return new ObjectId(id);
    });
    if (new Set(ids.map(String)).size !== ids.length) bad('Tranh tiêu biểu bị trùng');
    const count = await db.collection('artworks').countDocuments({ _id: { $in: ids }, status: 'published' });
    if (count !== ids.length) bad('Chỉ được chọn tranh đã công khai và còn tồn tại');
    data.featuredArtworkIds = ids;
  }
  if (!Object.keys(data).length) bad('Chưa có dữ liệu để cập nhật');
  const now = new Date();
  // MongoDB rejects the same field in $set and $setOnInsert, even on updates.
  const onInsert = { createdAt: now };
  if (!Object.hasOwn(data, 'name')) onInsert.name = 'Họa sĩ';
  await db.collection('artist_profile').updateOne({ singletonKey: 'main' }, {
    $set: { ...data, updatedAt: now },
    $setOnInsert: onInsert
  }, { upsert: true });
  return db.collection('artist_profile').findOne({ singletonKey: 'main' });
}

async function publicArtist(db) {
  const profile = await db.collection('artist_profile').findOne({ singletonKey: 'main' });
  if (!profile) return null;
  const ids = profile.featuredArtworkIds || [];
  const works = ids.length ? await db.collection('artworks').find({ _id: { $in: ids }, status: 'published' }).toArray() : [];
  const byId = new Map(works.map(work => [String(work._id), work]));
  return { ...profile, featuredArtworks: ids.map(id => byId.get(String(id))).filter(Boolean) };
}

module.exports = { saveArtist, publicArtist };
