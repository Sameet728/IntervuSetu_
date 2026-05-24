const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");

// Initialize Razorpay
// Note: You must add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret",
});

/**
 * POST /api/payment/create-order
 * Create a Razorpay Order
 */
const createOrder = async (req, res, next) => {
  try {
    const amount = 499 * 100; // e.g. rs 499

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_order_${req.user.id}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    res.status(500).json({ success: false, message: "Error creating payment order." });
  }
};

/**
 * POST /api/payment/verify
 * Verify payment signature and upgrade user plan
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummysecret")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Upgrade user to PRO and record transaction
      const transaction = {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: 499, // Fixed for now based on createOrder
        currency: "INR",
        status: "success",
        date: new Date()
      };

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { 
          $set: { plan: "pro" },
          $push: { transactions: transaction }
        },
        { new: true }
      );

      return res.json({
        success: true,
        message: "Payment successful. Account upgraded to Pro!",
        user: {
          plan: user.plan,
        },
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }
  } catch (error) {
    console.error("Razorpay verify error:", error);
    res.status(500).json({ success: false, message: "Error verifying payment." });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
