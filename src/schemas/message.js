import joi from 'joi';

export const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string(),
  from: joi.string().required(),
});
