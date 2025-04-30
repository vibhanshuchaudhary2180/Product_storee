import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import asyncHandler from "../middleware/async.middleware.js";
import mongoose from "mongoose";

// Create a new order
export const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }
    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Not enough stock for ${product.name}`);
    }
  }

  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  });

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    product.countInStock -= item.qty;
    await product.save();
  }

  const createdOrder = await order.save();
  res.status(201).json({ success: true, data: createdOrder });
});

// Get order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404);
    throw new Error("Invalid Order Id");
  }

  const order = await Order.findById(id).populate("user", "name email");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.isAdmin || order.user._id.toString() === req.user._id.toString()) {
    res.status(200).json({ success: true, data: order });
  } else {
    res.status(401);
    throw new Error("Not authorized to access this order");
  }
});

// Update order to paid
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.isAdmin || order.user.toString() === req.user._id.toString()) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer.email_address,
    };

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, data: updatedOrder });
  } else {
    res.status(401);
    throw new Error("Not authorized to update this order");
  }
});

// Update order to delivered
export const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { trackingNumber } = req.body;

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "delivered";
  if (trackingNumber) order.trackingNumber = trackingNumber;

  const updatedOrder = await order.save();
  res.status(200).json({ success: true, data: updatedOrder });
});

// Get logged in user's orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
});

// Get all orders (admin)
export const getOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;

  const count = await Order.countDocuments({});
  const orders = await Order.find({})
    .populate("user", "id name")
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// Update order status (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  if (!["processing", "shipped", "delivered", "cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;
  if (status === "shipped" && trackingNumber) {
    order.trackingNumber = trackingNumber;
  }
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }
  if (status === "cancelled" && !order.isDelivered) {
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.countInStock += item.qty;
        await product.save();
      }
    }
  }

  const updatedOrder = await order.save();
  res.status(200).json({ success: true, data: updatedOrder });
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.isDelivered) {
    res.status(400);
    throw new Error("Cannot cancel a delivered order");
  }

  order.status = "cancelled";

  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.countInStock += item.qty;
      await product.save();
    }
  }

  const updatedOrder = await order.save();
  res.status(200).json({ success: true, data: updatedOrder, message: "Order cancelled successfully" });
});
