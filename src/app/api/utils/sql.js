import pkg from 'pg';
const { Pool } = pkg;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

async function sql(strings, ...values) {
  if (!pool) {
    throw new Error(
      'No database connection string was provided to sql(). Perhaps process.env.DATABASE_URL has not been set'
    );
  }
  let query = '';
  const params = [];
  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`;
    }
  });
  const result = await pool.query(query, params);
  return result.rows;
}

export default sql;
