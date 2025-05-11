import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    brand: { type: String, required: true },
    mainImage: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true }
  },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String, required: true },
  size: { type: String, required: true },
  totalPrice: { type: Number, required: true }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  totalQuantity: {
    type: Number,
    default: 0
  },
  cartTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware để tự động cập nhật totalQuantity và cartTotal
cartSchema.pre('save', function(next) {
  this.totalQuantity = this.items.reduce((total, item) => total + item.quantity, 0);
  this.cartTotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart; 