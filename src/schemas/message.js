import joi from 'joi';

export const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().trim().required(),
  type: joi.string().valid('message', 'private_message'),
  from: joi.string().required(),
});
