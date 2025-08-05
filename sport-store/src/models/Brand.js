import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên thương hiệu là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên thương hiệu không được vượt quá 100 ký tự']
  },
  logo: {
    type: String,
    required: [true, 'Logo thương hiệu là bắt buộc'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Mô tả thương hiệu là bắt buộc'],
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },

  rating: {
    type: Number,
    min: [0, 'Đánh giá không được nhỏ hơn 0'],
    max: [5, 'Đánh giá không được lớn hơn 5'],
    default: 0
  },
  productsCount: {
    type: Number,
    min: [0, 'Số sản phẩm không được nhỏ hơn 0'],
    default: 0
  },



  features: [{
    type: String,
    enum: [
      'Premium Quality',
      'Innovation', 
      'Sustainability',
      'Performance',
      'Style',
      'Technology',
      'Comfort',
      'Heritage'
    ]
  }],
  isPremium: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: false
  },

  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
brandSchema.index({ name: 1 });
brandSchema.index({ status: 1 });
brandSchema.index({ featured: 1 });
brandSchema.index({ isPremium: 1 });
brandSchema.index({ isTrending: 1 });
brandSchema.index({ createdAt: -1 });

// Virtual for formatted products count
brandSchema.virtual('formattedProductsCount').get(function() {
  if (this.productsCount >= 1000000) {
    return (this.productsCount / 1000000).toFixed(1) + 'M';
  } else if (this.productsCount >= 1000) {
    return (this.productsCount / 1000).toFixed(1) + 'K';
  }
  return this.productsCount.toString();
});

// Pre-save middleware
brandSchema.pre('save', function(next) {
  // Auto-calculate rating if not set
  if (!this.rating) {
    this.rating = Math.random() * 2 + 3; // Random rating between 3-5
  }
  
  // Auto-calculate products count if not set
  if (!this.productsCount) {
    this.productsCount = Math.floor(Math.random() * 1000) + 50; // Random products count
  }
  
  next();
});

// Static method to get brand stats
brandSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        premium: { $sum: { $cond: ['$isPremium', 1, 0] } },
        trending: { $sum: { $cond: ['$isTrending', 1, 0] } },
        new: { $sum: { $cond: ['$isNew', 1, 0] } },
        featured: { $sum: { $cond: ['$featured', 1, 0] } },
        totalProducts: { $sum: '$productsCount' }
      }
    }
  ]);

  return stats[0];
};

// Instance method to toggle status
brandSchema.methods.toggleStatus = function() {
  this.status = this.status === 'active' ? 'inactive' : 'active';
  return this.save();
};

// Instance method to update stats
brandSchema.methods.updateStats = function(productsCount, followers) {
  if (productsCount !== undefined) this.productsCount = productsCount;
  if (followers !== undefined) this.followers = followers;
  return this.save();
};

export default mongoose.model('Brand', brandSchema); 