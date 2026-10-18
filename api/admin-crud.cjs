const { ObjectId } = require('mongodb');

const invalid = message => { const e = new Error(message); e.status = 400; throw e; };
const idOf = value => ObjectId.isValid(value) && String(new ObjectId(value)) === value ? new ObjectId(value) : invalid('ID không hợp lệ');
const plain = value => typeof value === 'string' ? value.trim() : '';
const slugify = value => plain(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categoryFields = ['name', 'slug', 'description', 'displayOrder', 'status', 'image'];
const artworkFields = ['title', 'slug', 'artworkCode', 'categoryId', 'shortDescription', 'description', 'story', 'images', 'yearCreated', 'material', 'surface', 'style', 'subject', 'dimensions', 'orientation', 'dominantColors', 'frame', 'price', 'showPrice', 'saleStatus', 'tags', 'featured', 'displayOrder', 'status', 'seo'];
const pick = (body, fields) => Object.fromEntries(fields.filter(k => Object.hasOwn(body, k)).map(k => [k, body[k]]));

async function validateCategory(body, db, current) {
  const item = { ...current, ...pick(body, categoryFields) };
  item.name = plain(item.name);
  item.slug = slugify(item.slug || item.name);
  if (!item.name || !item.slug) invalid('Tên và slug danh mục là bắt buộc');
  if (!['active', 'hidden'].includes(item.status || 'active')) invalid('Trạng thái danh mục không hợp lệ');
  item.status ||= 'active';
  if (!Number.isInteger(item.displayOrder ?? 0)) invalid('Thứ tự phải là số nguyên');
  item.displayOrder ??= 0;
  return item;
}

async function validateArtwork(body, db, current) {
  const item = { ...current, ...pick(body, artworkFields) };
  item.title = plain(item.title);
  item.slug = slugify(item.slug || item.title);
  item.artworkCode = plain(item.artworkCode);
  if (!item.title || !item.slug || !item.artworkCode || !item.categoryId) invalid('Thiếu tên, slug, mã tranh hoặc danh mục');
  item.categoryId = idOf(String(item.categoryId));
  if (!await db.collection('categories').findOne({ _id: item.categoryId })) invalid('Danh mục không tồn tại');
  item.status ||= 'draft'; item.saleStatus ||= 'available';
  if (!['draft', 'published', 'hidden'].includes(item.status)) invalid('Trạng thái hiển thị không hợp lệ');
  if (!['available', 'reserved', 'sold', 'display_only'].includes(item.saleStatus)) invalid('Tình trạng bán không hợp lệ');
  if (item.price != null && (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0)) invalid('Giá không hợp lệ');
  if (item.showPrice === true && (typeof item.price !== 'number' || !Number.isFinite(item.price))) invalid('Cần nhập giá khi công khai giá');
  if (item.dimensions && (!Number.isFinite(item.dimensions.width) || item.dimensions.width <= 0 || !Number.isFinite(item.dimensions.height) || item.dimensions.height <= 0 || (item.dimensions.depth !== undefined && (!Number.isFinite(item.dimensions.depth) || item.dimensions.depth <= 0)))) invalid('Kích thước tranh không hợp lệ');
  if (item.yearCreated != null && (!Number.isInteger(item.yearCreated) || item.yearCreated < 0 || item.yearCreated > new Date().getFullYear() + 1)) invalid('Năm sáng tác không hợp lệ');
  if (item.images !== undefined && (!Array.isArray(item.images) || item.images.some(img => !img || typeof img.url !== 'string' || typeof img.isPrimary !== 'boolean'))) invalid('Danh sách hình ảnh không hợp lệ');
  if (item.status === 'published' && (!item.images?.length || item.images.filter(i => i.isPrimary).length !== 1)) invalid('Tranh công khai phải có đúng một ảnh chính');
  return item;
}

async function adminCrud(req, path, body, db) {
  const section = path.match(/^\/api\/admin\/(artworks|categories)(?:\/([^/]+))?$/);
  if (!section) return null;
  const [, collection, id] = section;
  const col = db.collection(collection);
  if (req.method === 'GET') return { code: 200, value: id ? await col.findOne({ _id: idOf(id) }) : await col.find({}).sort({ updatedAt: -1 }).limit(200).toArray() };
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return null;
  if (req.method === 'POST' && id || req.method !== 'POST' && !id) invalid('Endpoint không hợp lệ');
  const objectId = id ? idOf(id) : null;
  const previous = objectId ? await col.findOne({ _id: objectId }) : null;
  if (id && !previous) return { code: 404, value: { error: 'Không tìm thấy dữ liệu' } };
  if (req.method === 'DELETE') {
    if (collection === 'categories' && await db.collection('artworks').countDocuments({ categoryId: objectId })) invalid('Danh mục đang được tranh sử dụng');
    await col.deleteOne({ _id: objectId });
    return { code: 200, value: { ok: true } };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('JSON phải là object');
  const validated = collection === 'categories' ? await validateCategory(body, db, previous) : await validateArtwork(body, db, previous);
  delete validated._id;
  delete validated.createdAt;
  delete validated.updatedAt;
  const now = new Date();
  if (req.method === 'POST') {
    const result = await col.insertOne({ ...validated, ...(collection === 'artworks' ? { viewCount: 0 } : {}), createdAt: now, updatedAt: now });
    return { code: 201, value: await col.findOne({ _id: result.insertedId }) };
  }
  await col.updateOne({ _id: objectId }, { $set: { ...validated, updatedAt: now } });
  return { code: 200, value: await col.findOne({ _id: objectId }) };
}

module.exports = { adminCrud };
