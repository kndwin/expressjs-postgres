const { promisify } = require('util')
import bodyParser from "body-parser";
import dotenv from 'dotenv'
import redis from 'redis'
import express from "express";
import pg from "pg";

import getJobs from './scrap'

dotenv.config()
// Connect to the database using the DATABASE_URL environment variable injected by Railway
const pool = new pg.Pool();

const app = express();
const client = redis.createClient({ url: process.env.REDIS_URL})
const port = process.env.PORT || 3333;

const getAsync = promisify(client.get).bind(client)
const setAsync = promisify(client.set).bind(client)

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

app.get("/", async (_, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.send(`Hello, World! The time from the DB is ${rows[0].now}`);
});

app.get('/redis', async (_, res) => {
	try {
		let visits = await getAsync('visits') | 0
		res.send(`Visit: ${visits}`)
		setAsync('visits', parseInt(visits.toString()) + 1)
	} catch (err) {
		console.error(err)
	}
})

app.get('/jobs', async (_, res) => {
	try {
		const jobs = await getAsync("cachedJobs")
		res.json(JSON.parse(jobs))
	} catch (err) {
		console.error(err)
	}
})

app.get('/update', async (_, res) => {
	try {
		console.log('updating jobs')
		const jobs = await getJobs();
		client.set("cachedJobs", JSON.stringify(jobs))
		res.json(jobs)
	} catch (err) {
		console.error(err)
	}
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
