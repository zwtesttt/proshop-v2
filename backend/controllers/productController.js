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
const getProductById = asyncHandler(async (req, res) => {
  const { id,page = 1, limit = 5  } = req.params;
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
  const { rating, comment,name } = req.body;
  
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
      name: name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    if(review.name === undefined){
      console.log("review.name",review.name);
      review.name = req.user.name
    }

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

// @desc    Delete a review from a product
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const { id, reviewId } = req.params;
  console.log("reviewId",reviewId);
  console.log("productId",id);

  // 查找产品并确保存在
  const product = await Product.findById(id);
  console.log("product",id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // 找到要删除的评论
  const review = product.reviews.find(review => review._id.toString() === reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // 检查当前用户是否有权限删除评论
  // 这里可以根据具体的权限系统进行自定义

  // 删除评论
  product.reviews = product.reviews.filter(review => review._id.toString() !== reviewId);
  await product.save();

  res.json({ message: 'Review removed' });
});

// @desc    Fetch latest reviews for a product
// @route   GET /api/products/:id/latest-reviews
// @access  Public
const getLatestProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 查询特定商品的最新评论，按时间倒序排序，选择前10条评论
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const latestReviews = product.reviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  res.json(latestReviews);
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
  deleteReview,
  getLatestProductReviews,
};
