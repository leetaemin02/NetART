const bcrypt = require('bcryptjs');
const { getDatabase, closeDatabase } = require('./connection.cjs');

(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    const fullName = (process.env.ADMIN_FULL_NAME || '').trim();
    if (!email || !fullName || password.length < 12) throw new Error('Cần ADMIN_EMAIL, ADMIN_FULL_NAME và ADMIN_PASSWORD ít nhất 12 ký tự trong .env.');
    const db = await getDatabase();
    if (await db.collection('admins').countDocuments({}) > 0) throw new Error('Đã có tài khoản quản trị. Script chỉ dùng để tạo admin đầu tiên.');
    await db.collection('admins').insertOne({ fullName, email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', status: 'active', lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() });
    console.log('Đã tạo tài khoản quản trị:', email);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { await closeDatabase(); }
})();
