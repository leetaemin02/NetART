const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../database/connection.cjs');
const { adminCrud } = require('./admin-crud.cjs');
const { saveArtist, publicArtist } = require('./artist-profile.cjs');

const sessions = new Map();
const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
};
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map(v => v.trim().split('=').slice(0, 2)).filter(v => v.length === 2));
const sidCookie = (value, req, expires = false) => `netart_session=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; ${req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? 'Secure; ' : ''}${expires ? 'Max-Age=0' : 'Max-Age=28800'}`;
const readBody = async (req) => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100000) throw Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('JSON không hợp lệ'), { status: 400 }); }
};
const publicSettings = ({ _id, singletonKey, siteName, logo, slogan, hero, contact, contactMessage, inquiryFormEnabled, defaultSeo, footerText } = {}) =>
  ({ siteName, logo, slogan, hero, contact, contactMessage, inquiryFormEnabled, defaultSeo, footerText });

async function api(req, res, url) {
  if (!url.pathname.startsWith('/api/')) return false;
  try {
    const db = await getDatabase();
    const path = url.pathname;
    if (path === '/api/health' && req.method === 'GET') {
      await db.command({ ping: 1 }); return json(res, 200, { ok: true });
    }
    if (path === '/api/categories' && req.method === 'GET') return json(res, 200, await db.collection('categories').find({ status: 'active' }).sort({ displayOrder: 1 }).toArray());
    if (path === '/api/artist' && req.method === 'GET') return json(res, 200, await publicArtist(db));
    if (path === '/api/site-settings/public' && req.method === 'GET') return json(res, 200, publicSettings(await db.collection('site_settings').findOne({ singletonKey: 'main' })));
    if (path === '/api/artworks' && req.method === 'GET') {
      const filter = { status: 'published' };
      for (const field of ['material', 'surface', 'style', 'subject', 'orientation', 'saleStatus']) if (url.searchParams.has(field)) filter[field] = url.searchParams.get(field);
      if (url.searchParams.has('categoryId')) {
        const id = url.searchParams.get('categoryId');
        if (!ObjectId.isValid(id)) return json(res, 400, { error: 'categoryId không hợp lệ' });
        filter.categoryId = new ObjectId(id);
      }
      if (url.searchParams.has('color')) filter.dominantColors = url.searchParams.get('color');
      if (url.searchParams.has('yearCreated')) {
        const y = Number(url.searchParams.get('yearCreated'));
        if (!Number.isInteger(y)) return json(res, 400, { error: 'yearCreated không hợp lệ' });
        filter.yearCreated = y;
      }
      const price = {};
      for (const [param, op] of [['minPrice', '$gte'], ['maxPrice', '$lte']]) {
        if (url.searchParams.has(param)) {
          const n = Number(url.searchParams.get(param));
          if (!Number.isFinite(n) || n < 0) return json(res, 400, { error: `${param} không hợp lệ` });
          price[op] = n;
        }
      }
      if (Object.keys(price).length) filter.price = price;
      const q = (url.searchParams.get('q') || '').trim();
      if (q) filter.$text = { $search: q.slice(0, 150) };
      const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page'), 10) || 1));
      const limit = Math.max(1, Math.min(50, Number.parseInt(url.searchParams.get('limit'), 10) || 12));
      const sorts = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, featured: { featured: -1, displayOrder: 1 } };
      const [items, total] = await Promise.all([
        db.collection('artworks').find(filter).sort(sorts[url.searchParams.get('sort')] || sorts.newest).skip((page - 1) * limit).limit(limit).toArray(),
        db.collection('artworks').countDocuments(filter)
      ]);
      return json(res, 200, { items, total, page, limit });
    }
    const slug = path.match(/^\/api\/artworks\/([^/]+)$/);
    if (slug && req.method === 'GET') {
      const item = await db.collection('artworks').findOneAndUpdate({ slug: decodeURIComponent(slug[1]), status: 'published' }, { $inc: { viewCount: 1 } }, { returnDocument: 'after' });
      return json(res, item ? 200 : 404, item || { error: 'Không tìm thấy tranh' });
    }
    if (!path.startsWith('/api/admin/')) return json(res, 404, { error: 'API không tồn tại' });
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin không hợp lệ' });
    const sid = cookies(req).netart_session;
    const session = sid && sessions.get(sid);
    if (session && session.expires <= Date.now()) sessions.delete(sid);
    if (path === '/api/admin/auth/login' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      if (typeof email !== 'string' || typeof password !== 'string') return json(res, 400, { error: 'Thiếu email hoặc mật khẩu' });
      const user = await db.collection('admins').findOne({ email: email.trim().toLowerCase(), status: 'active' });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) return json(res, 401, { error: 'Thông tin đăng nhập không hợp lệ' });
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { adminId: user._id, expires: Date.now() + 28800000 });
      await db.collection('admins').updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
      return json(res, 200, { ok: true, fullName: user.fullName }, { 'Set-Cookie': sidCookie(token, req) });
    }
    if (!session || session.expires <= Date.now() || !await db.collection('admins').findOne({ _id: session.adminId, status: 'active' })) return json(res, 401, { error: 'Yêu cầu đăng nhập quản trị' });
    if (path === '/api/admin/auth/logout' && req.method === 'POST') {
      sessions.delete(sid);
      return json(res, 200, { ok: true }, { 'Set-Cookie': sidCookie('', req, true) });
    }
    if (path === '/api/admin/dashboard' && req.method === 'GET') {
      const artworks = db.collection('artworks');
      const [total, available, reserved, sold, displayOnly, unpublished, views] = await Promise.all([
        artworks.countDocuments(), artworks.countDocuments({ saleStatus: 'available' }), artworks.countDocuments({ saleStatus: 'reserved' }),
        artworks.countDocuments({ saleStatus: 'sold' }), artworks.countDocuments({ saleStatus: 'display_only' }),
        artworks.countDocuments({ status: { $in: ['draft', 'hidden'] } }), artworks.aggregate([{ $group: { _id: null, n: { $sum: '$viewCount' } } }]).toArray()
      ]);
      return json(res, 200, { total, available, reserved, sold, displayOnly, unpublished, viewCount: views[0]?.n || 0 });
    }
    if (path === '/api/admin/artist' && req.method === 'GET') return json(res, 200, await db.collection('artist_profile').findOne({ singletonKey: 'main' }));
    if (path === '/api/admin/artist' && req.method === 'PATCH') return json(res, 200, await saveArtist(db, await readBody(req)));
    if (/^\/api\/admin\/(artworks|categories)(\/|$)/.test(path)) {
      const result = await adminCrud(req, path, ['POST', 'PATCH'].includes(req.method) ? await readBody(req) : undefined, db);
      if (result) return json(res, result.code, result.value);
    }
    return json(res, 404, { error: 'API quản trị chưa được triển khai' });
  } catch (err) {
    console.error('API error:', err.message);
    const code = err.code === 11000 ? 409 : err.status || 500;
    return json(res, code, { error: code === 409 ? 'Slug hoặc mã đã tồn tại' : code < 500 ? err.message : 'Lỗi máy chủ' });
  }
}

module.exports = { api };
