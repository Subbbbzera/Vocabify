import { DataSource } from 'typeorm';
import { User } from './src/user/entities/user.entity.js';
import { Dictionary } from './src/dictionary/entities/dictionary.entity.js';
import { Word } from './src/word/entities/word.entity.js';

async function seed() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'nestProject',
    entities: [User, Dictionary, Word],
    synchronize: true,
  });

  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(User);

    const existingUser = await userRepo.findOneBy({ email: 'fircailopavlo@gmail.com' });

    if (!existingUser) {
      const newUser = userRepo.create({
        name: 'Павло',
        email: 'fircailopavlo@gmail.com',
        password: 'Pavlopavlo666',
      });
      await userRepo.save(newUser);
      console.log('User created: Павло');
    } else {
      console.log('User already exists');
    }

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
