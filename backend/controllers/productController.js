import asyncHandler from '../middleware/asyncHandler.js';
import Product from '../models/productModel.js';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = process.env.PAGINATION_LIMIT;
  const page = Number(req.query.pageNumber) || 1;

  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};

  const count = await Product.countDocuments({ ...keyword });
  const products = await Product.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Fetch single product
// @route   GET /api/products/:id/:page/:limit
// @access  Public
// const getProductById = asyncHandler(async (req, res) => {
//   const product = await Product.findById(req.params.id);

//   if (product) {
//     // Increment views count by 1
//     product.views += 1;
//     // Save the updated product
//     await product.save();
//     return res.json(product);
//   } else {
//     res.status(404);
//     throw new Error('Product not found');
//   }
// });
const getProductById = asyncHandler(async (req, res) => {

  console.log('page:',req.params);
  const { id,page = 1, limit = 5  } = req.params;
  // const { page = 1, limit = 5 } = req.params; // 默认每页返回 5 条评论
  // 查询特定产品
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.views += 1;
  await product.save();
  // 计算评论分页参数
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // 获取产品的评论
  const reviews = product.reviews.slice(startIndex, endIndex);

  res.json({
    _id: product._id,
    user: product.user,
    name: product.name,
    image: product.image,
    brand: product.brand,
    category: product.category,
    description: product.description,
    rating: product.rating,
    numReviews: product.numReviews,
    price: product.price,
    countInStock: product.countInStock,
    views: product.views,
    purchases: product.purchases,
    reviews: reviews,
    // 添加评论总数和当前页码
    totalReviews: product.reviews.length,
    currentPage: page,
    totalPages: Math.ceil(product.reviews.length / limit)
  });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = new Product({
    name: 'Sample name',
    price: 0,
    user: req.user._id,
    image: '/images/sample.jpg',
    brand: 'Sample brand',
    category: 'Sample category',
    countInStock: 0,
    numReviews: 0,
    description: 'Sample description',
    purchases: 0,
    views: 0,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, description, image, brand, category, countInStock,views,purchases } =
    req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name;
    product.price = price;
    product.description = description;
    product.image = image;
    product.brand = brand;
    product.category = category;
    product.countInStock = countInStock;
    product.views = views;
    product.purchases = purchases;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await Product.deleteOne({ _id: product._id });
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    // const alreadyReviewed = product.reviews.find(
    //   (r) => r.user.toString() === req.user._id.toString()
    // );

    // if (alreadyReviewed) {
    //   res.status(400);
    //   throw new Error('Product already reviewed');
    // }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ rating: -1 }).limit(3);

  res.json(products);
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
};
