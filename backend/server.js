const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const Product = require('./models/product');
const productRoutes = require('./routes/products');
const Stripe = require('stripe');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Stripe with Secret Key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// serve HTML / CSS / JS
app.use(express.static(path.join(__dirname, '../frontend')));


const basicAuth = require('express-basic-auth');

// credentials just for the demo
const adminAuth = basicAuth({
  users: { baker: 'crumbs123' },   // username : password
  challenge: true                  // browser pops the login modal
});

// protect the admin page *and* its JSON endpoints
app.use('/admin.html', adminAuth);
app.use('/api/inventory', adminAuth);          // GET
app.use('/api/inventory/:id', adminAuth);      // PUT



// Routes
app.use('/api/products', productRoutes);
app.use('/api', require('./routes/address'));
app.use('/api', require('./routes/inventory'));


// Create Checkout Session Route
app.post('/create-checkout-session', async (req, res) => {
  const cart = req.body.cart;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    // Map cart items to Stripe line items
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.imageUrl],
        },
        unit_amount: Math.round(item.price * 100), // Convert dollars to cents
      },
      quantity: item.quantity,
    }));

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:5000/success.html',
      cancel_url:  'http://localhost:5000/cancel.html',
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'An error occurred while creating the checkout session' });
  }
});

// Sync Database and Seed Data
const seedDatabase = async () => {
    await sequelize.sync({ force: true }); // Use { force: true } for development; remove in production

await Product.bulkCreate([
  /* ─── Featured (for the carousel) ─── */
{
  name: 'Classic Chocolate Cake',
  description: 'Rich cocoa sponge with silky ganache frosting.',
  price: 21.99,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/ChocolateCake.jpg/640px-ChocolateCake.jpg',
  featured: false
},
{
  name: 'Artisan Sourdough Baguette',
  description: '48-hour fermented baguette with caramelised crust.',
  price: 7.50,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Baguette-246424.jpg/640px-Baguette-246424.jpg',
  category: 'Breads',
  featured: false
},
{
  name: 'Assorted Glazed Donuts (6-Pack)',
  description: 'Vanilla, chocolate, strawberry & maple glaze selection.',
  price: 9.99,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Krispy_Kreme_glazed_donuts_2.JPG/640px-Krispy_Kreme_glazed_donuts_2.JPG',
  category: 'Donuts',
  featured: false
},

/* ─── Daily delights ─── */
{
  name: 'All-Butter Croissant',
  description: 'Layered, flaky pastry baked golden every morning.',
  price: 3.20,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Croissant-Petr_Kratochvil.jpg/640px-Croissant-Petr_Kratochvil.jpg',
  category: 'Pastries'
},
{
  name: 'Raspberry Cheesecake Slice',
  description: 'Cream-cheese filling on graham base, raspberry swirl.',
  price: 4.50,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Raspberry_cheesecake.jpg/640px-Raspberry_cheesecake.jpg',
  category: 'Cheesecakes'
},
{
  name: 'Salted Pretzel',
  description: 'Hand-twisted, soft German-style pretzel with sea salt.',
  price: 2.30,
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Pretzel_%281%29.jpg/640px-Pretzel_%281%29.jpg',
  category: 'Pretzels'
}



]);




    console.log('Database synced and seeded.');
  };

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await seedDatabase();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
