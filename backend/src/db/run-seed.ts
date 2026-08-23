import db from './connection';

async function runSeeds() {
  try {
    console.log('Running seeds...');
    await db.seed.run();
    console.log('Seeds completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error);
  } finally {
    process.exit(0);
  }
}

runSeeds();
