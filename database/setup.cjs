const { getDatabase, closeDatabase } = require('./connection.cjs');

const string = { bsonType: 'string' };
const date = { bsonType: 'date' };
const image = { bsonType: 'object', properties: { url: string, publicId: string } };
const contact = { bsonType: 'object', properties: { phone: string, zaloUrl: string, facebookUrl: string, instagramUrl: string, email: string } };
const schema = (required, properties) => ({ $jsonSchema: { bsonType: 'object', required, properties } });
const options = (values) => ({ bsonType: 'string', enum: values });
const nonnegative = { bsonType: ['int', 'long', 'double', 'decimal'], minimum: 0 };

const validators = {
  admins: schema(['fullName', 'email', 'passwordHash', 'role', 'status', 'createdAt', 'updatedAt'], {
    fullName: string, email: { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
    passwordHash: string, role: options(['admin']), status: options(['active', 'blocked']),
    lastLoginAt: { bsonType: ['date', 'null'] }, createdAt: date, updatedAt: date
  }),
  categories: schema(['name', 'slug', 'displayOrder', 'status', 'createdAt', 'updatedAt'], {
    name: string, slug: string, description: string, image,
    displayOrder: { bsonType: ['int', 'long', 'double'] }, status: options(['active', 'hidden']),
    createdAt: date, updatedAt: date
  }),
  artworks: schema(['title', 'slug', 'artworkCode', 'categoryId', 'saleStatus', 'status', 'createdAt', 'updatedAt'], {
    title: string, slug: string, artworkCode: string, categoryId: { bsonType: 'objectId' },
    shortDescription: string, description: string, story: string,
    images: { bsonType: 'array', items: { bsonType: 'object', required: ['url', 'isPrimary'], properties: {
      url: string, publicId: string, alt: string, isPrimary: { bsonType: 'bool' }, displayOrder: { bsonType: ['int', 'long', 'double'] }
    } } },
    yearCreated: { bsonType: ['int', 'long', 'null'], minimum: 0 },
    material: string, surface: string, style: string, subject: string,
    dimensions: { bsonType: 'object', properties: { width: { bsonType: ['int', 'long', 'double'], minimum: 0, exclusiveMinimum: true }, height: { bsonType: ['int', 'long', 'double'], minimum: 0, exclusiveMinimum: true }, depth: { bsonType: ['int', 'long', 'double'], minimum: 0, exclusiveMinimum: true }, unit: string } },
    orientation: options(['landscape', 'portrait', 'square']),
    dominantColors: { bsonType: 'array', items: string },
    frame: { bsonType: 'object', properties: { included: { bsonType: 'bool' }, material: string, color: string } },
    price: { bsonType: ['int', 'long', 'double', 'decimal', 'null'], minimum: 0 },
    showPrice: { bsonType: 'bool' },
    saleStatus: options(['available', 'reserved', 'sold', 'display_only']),
    tags: { bsonType: 'array', items: string }, featured: { bsonType: 'bool' },
    viewCount: nonnegative, displayOrder: { bsonType: ['int', 'long', 'double'] },
    status: options(['draft', 'published', 'hidden']),
    seo: { bsonType: 'object', properties: { title: string, description: string, keywords: { bsonType: 'array', items: string } } },
    createdAt: date, updatedAt: date
  }),
  artist_profile: schema(['name', 'createdAt', 'updatedAt'], {
    singletonKey: options(['main']), name: string, artistName: string,
    avatar: image, coverImage: image, shortIntroduction: string, biography: string,
    specialties: { bsonType: 'array', items: string }, location: string, contact,
    galleryImages: { bsonType: 'array', items: { bsonType: 'object', required: ['url'], properties: { url: string, publicId: string, alt: string, displayOrder: { bsonType: ['int', 'long', 'double'] } } } },
    featuredArtworkIds: { bsonType: 'array', items: { bsonType: 'objectId' } },
    createdAt: date, updatedAt: date
  }),
  site_settings: schema(['siteName', 'updatedAt'], {
    singletonKey: options(['main']), siteName: string, logo: image, slogan: string,
    hero: { bsonType: 'object', properties: { title: string, subtitle: string, image } },
    contact, contactMessage: string, inquiryFormEnabled: { bsonType: 'bool' },
    defaultSeo: { bsonType: 'object', properties: { title: string, description: string } },
    footerText: string, updatedAt: date
  }),
  inquiries: schema(['customerName', 'phone', 'message', 'status', 'createdAt', 'updatedAt'], {
    artworkId: { bsonType: ['objectId', 'null'] }, customerName: string, phone: string,
    message: string, status: options(['new', 'contacted', 'discussing', 'completed', 'rejected']),
    adminNote: string, createdAt: date, updatedAt: date
  })
};

async function ensureCollections(db, withInquiries = false) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name));
  const names = ['admins', 'artworks', 'categories', 'artist_profile', 'site_settings'];
  if (withInquiries) names.push('inquiries');
  for (const name of names) {
    if (existing.has(name)) {
      await db.command({ collMod: name, validator: validators[name], validationLevel: 'strict', validationAction: 'error' });
    } else {
      await db.createCollection(name, { validator: validators[name], validationLevel: 'strict', validationAction: 'error' });
    }
  }
  await db.collection('admins').createIndex({ email: 1 }, { unique: true });
  await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
  await db.collection('categories').createIndex({ status: 1, displayOrder: 1 });
  await db.collection('artworks').createIndex({ slug: 1 }, { unique: true });
  await db.collection('artworks').createIndex({ artworkCode: 1 }, { unique: true });
  await db.collection('artworks').createIndex({ categoryId: 1, status: 1, saleStatus: 1 });
  await db.collection('artworks').createIndex({ material: 1, style: 1, orientation: 1 });
  await db.collection('artworks').createIndex({ price: 1 });
  await db.collection('artworks').createIndex({ featured: 1, status: 1, displayOrder: 1 });
  await db.collection('artworks').createIndex({ title: 'text', description: 'text', tags: 'text' });
  for (const name of ['artist_profile', 'site_settings']) {
    await db.collection(name).createIndex({ singletonKey: 1 }, { unique: true, partialFilterExpression: { singletonKey: { $exists: true } } });
  }
  if (withInquiries) {
    await db.collection('inquiries').createIndex({ status: 1, createdAt: -1 });
    await db.collection('inquiries').createIndex({ artworkId: 1 });
  }
  const now = new Date();
  await db.collection('artist_profile').updateOne({ singletonKey: 'main' }, {
    $setOnInsert: { name: 'Nguyễn Thị Hồng Ngọc', artistName: '', shortIntroduction: '', biography: '', specialties: [], location: '', contact: {}, createdAt: now, updatedAt: now }
  }, { upsert: true });
  await db.collection('site_settings').updateOne({ singletonKey: 'main' }, {
    $setOnInsert: { siteName: 'NÉT ART', slogan: '', hero: { title: '', subtitle: '' }, contact: { zaloUrl: 'https://zalo.me/0339667601' }, contactMessage: 'Liên hệ qua Zalo để trao đổi thêm về tác phẩm.', inquiryFormEnabled: false, footerText: '© NÉT ART', updatedAt: now }
  }, { upsert: true });
  return names;
}

if (require.main === module) {
  (async () => {
    try {
      const db = await getDatabase();
      const names = await ensureCollections(db, process.argv.includes('--with-inquiries'));
      console.log(`MongoDB ${db.databaseName}: ${names.join(', ')}`);
      console.log('Collections, indexes, validators và hai cấu hình ban đầu đã sẵn sàng.');
    } catch (error) {
      console.error('Không thể khởi tạo MongoDB:', error.message);
      process.exitCode = 1;
    } finally { await closeDatabase(); }
  })();
}

module.exports = { ensureCollections };
