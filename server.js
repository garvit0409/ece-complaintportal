require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        seedUsers();
    })
    .catch(err => console.log('MongoDB Error:', err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    id: String,
    role: String,
    name: String,
    email: { type: String, unique: true },
    pass: String,
    dept: String,
    enroll: String,
    isAdmin: { type: Boolean, default: false }
});

const ComplaintSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    studentId: String,
    studentName: String,
    category: String,
    title: String,
    description: String,
    attachment: String,
    isAnon: Boolean,
    status: String,
    assignedTo: String,
    history: Array,
    chat: Array,
    timestamp: String
});

const User = mongoose.model('User', UserSchema);
const Complaint = mongoose.model('Complaint', ComplaintSchema);

// --- SEED DATA ---
async function seedUsers() {
    const count = await User.countDocuments();
    if (count === 0) {
        const demoUsers = [
            { role: 'teacher', name: 'Dr. Smith', email: 'teacher1@example.com', pass: 'pass123', id: 'T01', dept: 'CSE' },
            { role: 'teacher', name: 'Prof. Jones', email: 'teacher2@example.com', pass: 'pass123', id: 'T02', dept: 'CSE' },
            { role: 'hod', name: 'Head of Department', email: 'ecedepartment100@gmail.com', pass: 'Secure@123', id: 'H01', dept: 'CSE', isAdmin: true }
        ];
        await User.insertMany(demoUsers);
        console.log('Default users seeded');
    }
}

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- API ROUTES ---

// 1. Auth & Users
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        const user = await User.findOne({ email, pass });
        if (user) res.json(user);
        else res.status(401).json({ error: 'Invalid credentials' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: 'Email likely already exists' }); }
});

app.get('/api/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

app.put('/api/users/:id', async (req, res) => {
    try {
        await User.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:email', async (req, res) => {
    try {
        await User.findOneAndDelete({ email: req.params.email });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Complaints
app.get('/api/complaints', async (req, res) => {
    const complaints = await Complaint.find();
    res.json(complaints);
});

app.post('/api/complaints', async (req, res) => {
    try {
        const nc = new Complaint(req.body);
        await nc.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/complaints/:id', async (req, res) => {
    try {
        await Complaint.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Email
app.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;

    const mailOptions = {
        from: '"Grievance Portal" <ecedepartment100@gmail.com>',
        to: to,
        subject: subject,
        text: text
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});