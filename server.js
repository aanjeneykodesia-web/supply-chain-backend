const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   MOCK DATABASE (PROJECT)
========================= */

let users = [
  { id: "A1", mobile: "9999999999", role: "admin" },
  { id: "M1", mobile: "8888888888", role: "manufacturer" },
  { id: "M2", mobile: "8888888887", role: "manufacturer" },
  { id: "S1", mobile: "7777777777", role: "shopkeeper" },
  { id: "T1", mobile: "6666666666", role: "transporter" }
];

let otpStore = {};
let manufacturerOrders = [];
let orderCounter = 1;

/* =========================
   OTP LOGIN
========================= */

app.post("/send-otp", (req, res) => {
  const { mobile } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[mobile] = otp;
  console.log("OTP:", otp);
  res.json({ message: "OTP sent" });
});

app.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  if (otpStore[mobile] == otp) {
    delete otpStore[mobile];
    const user = users.find(u => u.mobile === mobile);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      success: true,
      userId: user.id,
      role: user.role
    });
  } else {
    res.status(401).json({ message: "Invalid OTP" });
  }
});

/* =========================
   ORDER SPLITTING
========================= */

app.post("/place-order", (req, res) => {
  const { shopkeeperId, items } = req.body;
  const grouped = {};

  items.forEach(item => {
    if (!grouped[item.manufacturerId]) {
      grouped[item.manufacturerId] = [];
    }
    grouped[item.manufacturerId].push(item);
  });

  Object.keys(grouped).forEach(manufacturerId => {
    manufacturerOrders.push({
      orderId: "ORD-" + orderCounter++,
      shopkeeperId,
      manufacturerId,
      items: grouped[manufacturerId],
      status: "Pending"
    });
  });

  res.json({ message: "Order placed and split successfully" });
});

/* =========================
   MANUFACTURER VIEW
========================= */

app.get("/manufacturer-orders/:manufacturerId", (req, res) => {
  const orders = manufacturerOrders.filter(
    o => o.manufacturerId === req.params.manufacturerId
  );
  res.json(orders);
});

/* =========================
   ADMIN VIEW
========================= */

app.get("/all-orders", (req, res) => {
  res.json(manufacturerOrders);
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});