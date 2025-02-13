require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// Define Appointment Schema
const appointmentSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    service: String,
    date: String,
    time: String,
    status: { type: String, default: "Pending" }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

// 📌 Route: Create Appointment
app.post("/appointments", async (req, res) => {
    try {
        const newAppointment = new Appointment(req.body);
        await newAppointment.save();
        res.status(201).json({ message: "Appointment booked successfully!" });

        // Send confirmation email
        sendEmail(req.body.email, "Appointment Confirmation", 
            `Hello ${req.body.name},\n\nYour appointment for ${req.body.service} on ${req.body.date} at ${req.body.time} is received. We will confirm soon.\n\nThank you!`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📌 Route: Get All Appointments
app.get("/appointments", async (req, res) => {
    try {
        const appointments = await Appointment.find();
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📌 Route: Update Appointment Status
app.put("/appointments/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        // Send email notification on approval/rejection
        if (status === "Approved" || status === "Rejected") {
            sendEmail(updatedAppointment.email, `Appointment ${status}`, 
                `Hello ${updatedAppointment.name},\n\nYour appointment for ${updatedAppointment.service} on ${updatedAppointment.date} at ${updatedAppointment.time} has been ${status}.\n\nThank you!`);
        }

        res.json(updatedAppointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📌 Route: Delete Appointment
app.delete("/appointments/:id", async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: "Appointment deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📌 Function: Send Emails
const sendEmail = (to, subject, message) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("Email Error:", error);
        else console.log("Email Sent:", info.response);
    });
};

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
