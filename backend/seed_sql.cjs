const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/nestProject"
  });

  try {
    await client.connect();
    console.log("Connected to DB");

    const password = 'fircailopavlo@gmail.com';
    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await client.query('SELECT id FROM "user" WHERE email = $1', ['fircailopavlo@gmail.com']);

    if (res.rows.length === 0) {
      await client.query(
        'INSERT INTO "user" (name, email, password) VALUES ($1, $2, $3)',
        ['Павло', 'fircailopavlo@gmail.com', hashedPassword]
      );
      console.log("User seeded successfully");
    } else {
      await client.query(
        'UPDATE "user" SET password = $1 WHERE email = $2',
        [hashedPassword, 'fircailopavlo@gmail.com']
      );
      console.log("User password updated");
    }

  } catch (err) {
    console.error("Error seeding user:", err);
  } finally {
    await client.end();
  }
}

seed();
