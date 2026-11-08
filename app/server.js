'use strict';

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});

app.use(express.json({ limit: '16kb' }));

app.get('/api/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/records', async (_request, response, next) => {
  try {
    const [records] = await pool.query(
      'SELECT id, title, created_at FROM records ORDER BY id DESC'
    );
    response.json(records);
  } catch (error) {
    next(error);
  }
});

app.post('/api/records', async (request, response, next) => {
  const title = typeof request.body.title === 'string'
    ? request.body.title.trim()
    : '';
  if (!title || title.length > 200) {
    return response.status(400).json({
      error: 'Title must contain 1-200 characters.'
    });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO records (title) VALUES (?)',
      [title]
    );
    response.status(201).json({ id: result.insertId, title });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: 'The application could not complete the request.'
  });
});

async function start() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      app.listen(3000, '0.0.0.0', () => {
        console.log('Todo API listening on port 3000');
      });
      return;
    } catch (error) {
      console.error(`Waiting for database (${attempt}/60): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  process.exit(1);
}

start();
