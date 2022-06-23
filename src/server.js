import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { MongoClient } from 'mongodb';

dotenv.config();

const PORT = process.env.PORT || 5000;

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db('bate_papo_uol');
});

const server = express();
server.use(cors());
server.use(json());

server.get('/participants', (req, res) => {
  db.collection('participants')
    .find()
    .toArray()
    .then((participants) => {
      res.send(participants);
    });
});

server.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});
