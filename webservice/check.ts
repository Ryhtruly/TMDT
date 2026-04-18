import { pool } from './src/config/db';

pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_name='users' or table_name='shops'`)
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
