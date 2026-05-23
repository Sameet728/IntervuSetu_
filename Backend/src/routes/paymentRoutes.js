const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

module.exports = router;
