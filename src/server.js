import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

import { MongoClient, ObjectId } from 'mongodb';

import { participantSchema } from './schemas/participant.js';
import { messageSchema } from './schemas/message.js';

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

    return res.send(collectionArray);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    // await mongoClient.close();
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

    const data = dayjs(Date.now()).format('HH:MM:ss');
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
    // await mongoClient.close();
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

    if (limit) {
      const limitedMessagesArray = messagesVisible.slice(-limit);
      return res.send(limitedMessagesArray);
    }

    return res.send(messagesVisible);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    // await mongoClient.close();
  }
});

server.post('/messages', async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');

    const participantsCollection = db.collection('participants');
    const participantDB = await participantsCollection.findOne({ name: user });

    if (!participantDB) {
      return res.status(422).send('usuário não cadastrado');
    }

    const message = {
      from: user,
      to: to,
      text: text,
      type: type,
    };
    const messageValidation = messageSchema.validate(message);
    if (messageValidation.error) {
      const errorsMessageArray = messageValidation.error.details.map(
        (error) => error.message
      );
      return res.status(422).send(errorsMessageArray);
    }

    const data = dayjs(Date.now()).format('HH:MM:ss');
    const messageObject = {
      ...message,
      time: data,
    };

    const messagesCollection = db.collection('messages');
    await messagesCollection.insertOne(messageObject);

    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  } finally {
    // await mongoClient.close();
  }
});

server.post('/status', async (req, res) => {
  const { user } = req.headers;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');
    const participantsCollection = db.collection('participants');
    const participantDB = await participantsCollection.findOne({ name: user });

    if (!participantDB) {
      return res.sendStatus(404);
    }

    await participantsCollection.updateOne(
      {
        name: user,
      },
      { $set: { lastStatus: Date.now() } }
    );

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    // await mongoClient.close();
  }
});

server.delete('/messages/:id', async (req, res) => {
  const { user } = req.headers;
  const { id } = req.params;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');
    const messagesCollection = db.collection('messages');
    const messageDB = await messagesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!messageDB) {
      console.log('deu null');
      return res.sendStatus(404);
    }

    if (messageDB.from !== user) {
      return res.sendStatus(401);
    }

    await messagesCollection.deleteOne({ _id: new ObjectId(id) });

    return res.sendStatus(204);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

setInterval(async () => {
  try {
    await mongoClient.connect();
    const db = mongoClient.db('batePapoUol');
    const participantsCollection = db.collection('participants');
    const participantsArray = await participantsCollection.find().toArray();

    if (participantsArray.length === 0) {
      return;
    }

    participantsArray.forEach(async (participant) => {
      if (Date.now() - participant.lastStatus > 10000) {
        await participantsCollection.deleteOne({
          _id: new ObjectId(participant._id),
        });

        const data = dayjs(Date.now()).format('HH:MM:ss');
        const messageObject = {
          from: participant.name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: data,
        };

        const messagesCollection = db.collection('messages');
        await messagesCollection.insertOne(messageObject);
      }
    });
  } catch (error) {
    console.log(error);
  }
}, 15000); // 15 seconds

server.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});
