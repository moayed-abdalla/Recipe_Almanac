import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const almanacRoutes = require('./routes/almanac');
const recipeRoutes = require('./routes/recipes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/almanac', almanacRoutes);
app.use('/api/recipes', recipeRoutes);

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


