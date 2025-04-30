import User from "../models/user.model.js";
import asyncHandler from "../middleware/async.middleware.js";
import generateToken from "../utils/generateToken.js";
import mongoose from "mongoose";

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      },
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      },
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (user) {
    res.status(200).json({
      success: true,
      data: user,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser._id),
      },
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.status(200).json({
    success: true,
    data: users,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid User Id");
  }

  const user = await User.findById(id);

  if (user) {
    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid User Id");
  }

  const user = await User.findById(id).select("-password");

  if (user) {
    res.status(200).json({
      success: true,
      data: user,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid User Id");
  }

  const user = await User.findById(id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Add address to user profile
// @route   POST /api/users/profile/address
// @access  Private
export const addUserAddress = asyncHandler(async (req, res) => {
  const { address, city, postalCode, country, isDefault } = req.body;

  if (!address || !city || !postalCode || !country) {
    res.status(400);
    throw new Error("Please provide all address fields");
  }

  const user = await User.findById(req.user._id);

  if (user) {
    const newAddress = {
      address,
      city,
      postalCode,
      country,
      isDefault: isDefault || false
    };

    // If new address is default, set all others to non-default
    if (isDefault) {
      user.shippingAddresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    user.shippingAddresses.push(newAddress);
    
    const updatedUser = await user.save();

    res.status(201).json({
      success: true,
      data: updatedUser.shippingAddresses,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user address
// @route   PUT /api/users/profile/address/:addressId
// @access  Private
export const updateUserAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { address, city, postalCode, country, isDefault } = req.body;
  
  const user = await User.findById(req.user._id);

  if (user) {
    const addressIndex = user.shippingAddresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex >= 0) {
      // If updated address is default, set all others to non-default
      if (isDefault) {
        user.shippingAddresses.forEach(addr => {
          addr.isDefault = false;
        });
      }

      // Update the address
      if (address) user.shippingAddresses[addressIndex].address = address;
      if (city) user.shippingAddresses[addressIndex].city = city;
      if (postalCode) user.shippingAddresses[addressIndex].postalCode = postalCode;
      if (country) user.shippingAddresses[addressIndex].country = country;
      if (isDefault !== undefined) user.shippingAddresses[addressIndex].isDefault = isDefault;

      await user.save();
      
      res.status(200).json({
        success: true,
        data: user.shippingAddresses,
      });
    } else {
      res.status(404);
      throw new Error("Address not found");
    }
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Delete user address
// @route   DELETE /api/users/profile/address/:addressId
// @access  Private
export const deleteUserAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  
  const user = await User.findById(req.user._id);

  if (user) {
    const addressIndex = user.shippingAddresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex >= 0) {
      user.shippingAddresses.splice(addressIndex, 1);
      await user.save();
      
      res.status(200).json({
        success: true,
        data: user.shippingAddresses,
        message: "Address removed"
      });
    } else {
      res.status(404);
      throw new Error("Address not found");
    }
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Add product to wishlist
// @route   POST /api/users/profile/wishlist
// @access  Private
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const user = await User.findById(req.user._id);

  if (user) {
    if (user.wishlist.includes(productId)) {
      res.status(400);
      throw new Error("Product already in wishlist");
    }

    user.wishlist.push(productId);
    await user.save();
    
    const populatedUser = await User.findById(req.user._id).populate('wishlist', 'name image price');
    
    res.status(200).json({
      success: true,
      data: populatedUser.wishlist,
      message: "Product added to wishlist"
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/profile/wishlist/:productId
// @access  Private
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(404);
    throw new Error("Invalid Product Id");
  }

  const user = await User.findById(req.user._id);

  if (user) {
    const index = user.wishlist.indexOf(productId);
    
    if (index === -1) {
      res.status(404);
      throw new Error("Product not in wishlist");
    }
    
    user.wishlist.splice(index, 1);
    await user.save();
    
    const populatedUser = await User.findById(req.user._id).populate('wishlist', 'name image price');
    
    res.status(200).json({
      success: true,
      data: populatedUser.wishlist,
      message: "Product removed from wishlist"
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user wishlist
// @route   GET /api/users/profile/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name image price');

  if (user) {
    res.status(200).json({
      success: true,
      data: user.wishlist,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});