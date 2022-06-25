import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

import { MongoClient } from 'mongodb';

import { participantSchema } from './schemas/participant.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const mongoClient = new MongoClient(process.env.MONGO_URI);
// let db;

// mongoClient.connect().then(() => {
//   db = mongoClient.db('batePapoUol');
// });

const server = express();
server.use(cors());
server.use(json());

server.get('/participants', async (req, res) => {
  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');
    const participantsCollection = db.collection('participants');

    const collectionArray = await participantsCollection.find().toArray();
    mongoClient.close();

    return res.send(collectionArray);
  } catch (error) {
    console.log(error);
    mongoClient.close();
    return res.status(500).send(error);
  }
});

server.post('/participants', async (req, res) => {
  const { name } = req.body;
  const participantValidation = participantSchema.validate({ name });

  if (participantValidation.error) {
    return res.status(422).send('name deve ser string não vazio');
  }

  const participant = {
    name,
    lastStatus: Date.now(),
  };

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');

    const participantsCollection = db.collection('participants');

    const participantDB = await participantsCollection.findOne({ name });

    if (participantDB) {
      return res.status(409).send('Nome já cadastrado');
    }

    await participantsCollection.insertOne(participant);

    const data = dayjs().format('HH:MM:ss');
    const messageObject = {
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: data,
    };

    const messagesCollection = db.collection('messages');
    await messagesCollection.insertOne(messageObject);

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  } finally {
    await mongoClient.close();
  }
});

server.get('/messages', async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');
    const messagesCollection = db.collection('messages');

    const messagesArray = await messagesCollection.find().toArray();
    // const messagesArrayInverted = messagesArray.reverse();
    const messagesVisible = messagesArray.filter((message) => {
      return (
        message.from === user || message.to === user || message.to === 'Todos'
      );
    });

    mongoClient.close();
    if (limit) {
      const limitedMessagesArray = messagesVisible.slice(-limit);
      return res.send(limitedMessagesArray);
    }

    return res.send(messagesVisible);
  } catch (error) {
    console.log(error);
    mongoClient.close();
    return res.status(500).send(error);
  }
});

server.post('/messages', async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');

    const participantsCollection = db.collection('participants');
    const participantDB = await participantsCollection.findOne({ user });

    if (!participantDB) {
      return res.status(422).send('usuário não cadastrado');
    }

    const data = dayjs().format('HH:MM:ss');
    const messageObject = {
      from: user,
      to: to,
      text: text,
      type: type,
      time: data,
    };

    const messagesCollection = db.collection('messages');
    await messagesCollection.insertOne(messageObject);

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  } finally {
    mongoClient.close();
  }
});

server.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});
