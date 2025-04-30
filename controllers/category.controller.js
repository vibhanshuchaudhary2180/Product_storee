import Category from "../models/category.model.js";
import asyncHandler from "../middleware/async.middleware.js";

// Get all categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: categories });
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (category) {
    res.status(200).json({ success: true, data: category });
  } else {
    res.status(404);
    throw new Error("Category not found");
  }
});

// Create new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, parent } = req.body;

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    res.status(400);
    throw new Error("Category already exists");
  }

  const category = new Category({ name, description, image, parent });
  const createdCategory = await category.save();

  res.status(201).json({ success: true, data: createdCategory });
});

// Update category
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  const { name, description, image, parent, isActive } = req.body;

  category.name = name ?? category.name;
  category.description = description ?? category.description;
  category.image = image ?? category.image;
  category.parent = parent ?? category.parent;
  category.isActive = typeof isActive === "boolean" ? isActive : category.isActive;

  const updatedCategory = await category.save();
  res.status(200).json({ success: true, data: updatedCategory });
});

// Delete category
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  await category.remove();
  res.status(200).json({ success: true, message: "Category removed" });
});
