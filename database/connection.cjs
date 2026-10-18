require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let connection;

async function getDatabase() {
  if (connection) return connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI. Hãy cấu hình file .env (xem .env.example).');
  if (!client) client = new MongoClient(uri, { serverSelectionTimeoutMS: 7000 });
  try {
    await client.connect();
    connection = client.db(process.env.MONGODB_DB_NAME || 'net_art_gallery');
    return connection;
  } catch (error) {
    await client.close().catch(() => {});
    client = undefined;
    throw error;
  }
}

async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  connection = undefined;
}

module.exports = { getDatabase, closeDatabase };
