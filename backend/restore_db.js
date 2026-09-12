const { Client } = require('pg');

async function restore() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '123',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to postgres database.');

    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nestProject'");
    if (res.rowCount === 0) {
      console.log('Database nestProject does not exist. Creating...');
      await client.query('CREATE DATABASE "nestProject"');
      console.log('Database nestProject created successfully.');
    } else {
      console.log('Database nestProject already exists.');
    }
  } catch (err) {
    console.error('Error restoring database:', err.message);
  } finally {
    await client.end();
  }
}

restore();
