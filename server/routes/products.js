const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

router.get('/', async (req, res) => {
  const products = await Product.find({ user: req.user.id });
  res.json(products);
});

router.post('/', async (req, res) => {
  const product = await Product.create({ ...req.body, user: req.user.id });
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { returnDocument: 'after' }
  );
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  await Product.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ message: 'Product deleted' });
});

module.exports = router;
