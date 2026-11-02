const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const router = express.Router();

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

const parsePage = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { search, isActive, page, limit } = req.query;
    const query = { user: userId };

    if (typeof isActive !== 'undefined') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegExp(search.trim()), 'i');
      query.$or = [{ name: regex }, { size: regex }];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Product.find(query)
      .select('name size bottlesPerCase pricePerUnit isActive createdAt updatedAt')
      .sort({ createdAt: 1 })
      .lean();

    if (!hasPagination) {
      const products = await baseQuery;
      return res.json(products);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [products, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: products, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { name, size, bottlesPerCase, pricePerUnit } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Product name is required' });
  }

  const parsedPrice = parseFloat(pricePerUnit);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ message: 'Valid price per bottle is required' });
  }

  const product = await Product.create({
    name: name.trim(),
    size: size || '500ml',
    bottlesPerCase: parseInt(bottlesPerCase, 10) || 12,
    pricePerUnit: parsedPrice,
    isActive: true,
    user: userId,
  });

  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const updateData = { ...req.body };

  if (updateData.pricePerUnit !== undefined) updateData.pricePerUnit = parseFloat(updateData.pricePerUnit);
  if (updateData.bottlesPerCase !== undefined) updateData.bottlesPerCase = parseInt(updateData.bottlesPerCase, 10) || 12;
  if (updateData.name) updateData.name = updateData.name.trim();

  const product = await Product.findOneAndUpdate({ _id: req.params.id, user: userId }, updateData, { returnDocument: 'after', runValidators: true });

  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;

  const referencedCount = await Order.countDocuments({ user: userId, 'lines.product': req.params.id });

  if (referencedCount > 0) {
    const archivedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { isActive: false },
      { returnDocument: 'after' }
    );
    return res.json({ message: 'Product archived to preserve historical orders', product: archivedProduct, archived: true });
  }

  await Product.findOneAndDelete({ _id: req.params.id, user: userId });
  res.json({ message: 'Product deleted permanently', archived: false });
});

module.exports = router;
