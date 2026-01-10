// ==========================
// IMPORTS & SETUP
// ==========================
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================
// USERS (DEMO DATA)
// ==========================
let users = [
  { id: "A1", mobile: "9999999999", role: "admin" },
  { id: "M1", mobile: "8888888888", role: "manufacturer" },
  { id: "M2", mobile: "8888888887", role: "manufacturer" },
  { id: "S1", mobile: "7777777777", role: "shopkeeper" },
  { id: "T1", mobile: "6666666666", role: "transporter" }
];

// ==========================
// IN-MEMORY STORES
// ==========================
let otpStore = {}; 
// otpStore[mobile] = { otp: 123456, expiresAt: timestamp }

let manufacturerOrders = [];
let orderCounter = 1;

// ==========================
// SEND OTP (REAL SMS)
// ==========================
app.post("/send-otp", async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: "Mobile number required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

  otpStore[mobile] = { otp, expiresAt };

  try {
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        numbers: mobile,
        variables_values: otp
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Generated OTP:", otp);
    res.json({ message: "OTP sent" });

  } catch (error) {
    console.error("SMS error:", error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ==========================
// VERIFY OTP
// ==========================
app.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;

  const record = otpStore[mobile];
  if (!record) {
    return res.status(400).json({ message: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[mobile];
    return res.status(400).json({ message: "OTP expired" });
  }

  if (record.otp != otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  delete otpStore[mobile];

  const user = users.find(u => u.mobile === mobile);
  if (!user) {
    return res.status(404).json({ message: "User not registered" });
  }

  res.json({
    success: true,
    userId: user.id,
    role: user.role
  });
});

// ==========================
// PLACE ORDER (SHOPKEEPER)
// ==========================
app.post("/place-order", (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: "Invalid order items" });
  }

  items.forEach(item => {
    manufacturerOrders.push({
      orderId: orderCounter++,
      manufacturerId: item.manufacturerId,
      product: item.product,
      quantity: item.quantity,
      status: "pending"
    });
  });

  res.json({ message: "Order placed successfully" });
});

// ==========================
// MANUFACTURER VIEW ORDERS
// ==========================
app.get("/manufacturer-orders/:manufacturerId", (req, res) => {
  const { manufacturerId } = req.params;

  const orders = manufacturerOrders.filter(
    o => o.manufacturerId === manufacturerId
  );

  res.json(orders);
});

// ==========================
// ADMIN VIEW REQUESTS
// ==========================
app.get("/admin-requests", (req, res) => {
  res.json({
    manufacturers: users.filter(u => u.role === "manufacturer"),
    transporters: users.filter(u => u.role === "transporter")
  });
});

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.send("Supply Chain Backend Running 🚀");
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});