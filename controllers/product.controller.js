import mongoose from "mongoose";
import Product from "../models/product.model.js";
import asyncHandler from "../middleware/async.middleware.js";

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  
  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  const count = await Product.countDocuments({ ...keyword });
  const products = await Product.find({ ...keyword })
    .populate('category', 'name')
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const product = await Product.findById(id).populate('category', 'name');

  if (product) {
    res.status(200).json({ success: true, data: product });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const product = req.body;

  if (!product.name || !product.price || !product.image || !product.category || !product.description) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  // Set the user who created the product
  product.user = req.user._id;

  const newProduct = new Product(product);
  const createdProduct = await newProduct.save();

  res.status(201).json({ success: true, data: createdProduct });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    product,
    { new: true }
  ).populate('category', 'name');

  if (updatedProduct) {
    res.status(200).json({ success: true, data: updatedProduct });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const product = await Product.findById(id);

  if (product) {
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Product deleted" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
export const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({})
    .sort({ rating: -1 })
    .limit(5);

  res.status(200).json({ success: true, data: products });
});

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
export const createProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const product = await Product.findById(id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

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
    res.status(201).json({ success: true, message: "Review added" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    res.status(404);
    throw new Error("Invalid Category Id");
  }

  const products = await Product.find({ category: categoryId })
    .populate('category', 'name');

  res.status(200).json({ success: true, data: products });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ featuredProduct: true })
    .populate('category', 'name')
    .limit(8);

  res.status(200).json({ success: true, data: products });
});

// @desc    Get discounted products
// @route   GET /api/products/discounted
// @access  Public
export const getDiscountedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDiscounted: true })
    .populate('category', 'name')
    .sort({ discountPrice: 1 });

  res.status(200).json({ success: true, data: products });
});

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private/Admin
export const updateProductStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { countInStock } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const product = await Product.findById(id);

  if (product) {
    product.countInStock = countInStock;
    
    const updatedProduct = await product.save();
    
    res.status(200).json({ success: true, data: updatedProduct });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});