require("dotenv").config(); // Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // For admin authentication
const bcrypt = require("bcrypt"); // Secure password storage

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "https://cloud.mongodb.com/v2/67ad37a611af767e645b61c0#"; // U

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Appointment Schema & Model
const appointmentSchema = new mongoose.Schema({
    name: String,
    email: String,
    date: String,
    time: String,
    status: { type: String, default: "Pending" }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

// ✅ Admin Schema & Model (For Authentication)
const adminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Admin = mongoose.model("Admin", adminSchema);

// ================== Appointment Routes ==================
// 🔹 GET All Appointments (For Admin Dashboard)
app.get("/api/appointments", async (req, res) => {
    try {
        const appointments = await Appointment.find();
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching appointments" });
    }
});

// 🔹 POST Create New Appointment
app.post("/api/appointments", async (req, res) => {
    try {
        const { name, email, date, time } = req.body;
        const newAppointment = new Appointment({ name, email, date, time });
        await newAppointment.save();
        res.status(201).json({ message: "Appointment created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error creating appointment" });
    }
});

// 🔹 PUT Update Appointment Status
app.put("/api/appointments/:id", async (req, res) => {
    try {
        const { status } = req.body;
        await Appointment.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: "Appointment status updated" });
    } catch (error) {
        res.status(500).json({ message: "Error updating appointment" });
    }
});

// 🔹 DELETE Appointment
app.delete("/api/appointments/:id", async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting appointment" });
    }
});

// ================== Admin Authentication Routes ==================
// 🔹 Admin Signup (Only Run Once to Create Admin)
app.post("/api/admin/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10); // Hash password
        const newAdmin = new Admin({ username, password: hashedPassword });
        await newAdmin.save();
        res.status(201).json({ message: "Admin registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error registering admin" });
    }
});

// 🔹 Admin Login
app.post("/api/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ username: admin.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, message: "Login successful" });
    } catch (error) {
        res.status(500).json({ message: "Error logging in" });
    }
});

// 🔹 Admin Logout (Handled on Frontend by Clearing Token)

// ================== Start Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
