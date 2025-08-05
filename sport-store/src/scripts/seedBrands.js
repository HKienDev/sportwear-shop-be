import mongoose from 'mongoose';
import Brand from '../models/Brand.js';
import env from '../config/env.js';

const sampleBrands = [
  {
    name: 'Nike',
    logo: '/images/brands/nike.png',
    description: 'Just Do It. Thương hiệu thể thao hàng đầu thế giới với các sản phẩm chất lượng cao.',
    rating: 4.8,
    productsCount: 1250,
    features: ['Premium Quality', 'Innovation', 'Sustainability', 'Performance'],
    isPremium: true,
    isTrending: true,
    isNew: false,
    featured: true,
    status: 'active'
  },
  {
    name: 'Adidas',
    logo: '/images/brands/adidas.jpg',
    description: 'Impossible is Nothing. Thương hiệu thể thao với thiết kế độc đáo và công nghệ tiên tiến.',
    rating: 4.7,
    productsCount: 980,
    features: ['Innovation', 'Sustainability', 'Performance', 'Style'],
    isPremium: true,
    isTrending: true,
    isNew: false,
    featured: true,
    status: 'active'
  },
  {
    name: 'Puma',
    logo: '/images/brands/puma.png',
    description: 'Forever Faster. Thương hiệu thể thao với thiết kế hiện đại và hiệu suất cao.',
    rating: 4.6,
    productsCount: 750,
    features: ['Performance', 'Style', 'Innovation', 'Premium Quality'],
    isPremium: true,
    isTrending: false,
    isNew: false,
    featured: false,
    status: 'active'
  },
  {
    name: 'Under Armour',
    logo: '/images/brands/under-armour.png',
    description: 'The Only Way Is Through. Thương hiệu thể thao với công nghệ tiên tiến.',
    rating: 4.5,
    productsCount: 600,
    features: ['Technology', 'Performance', 'Innovation', 'Premium Quality'],
    isPremium: true,
    isTrending: false,
    isNew: false,
    featured: false,
    status: 'active'
  },
  {
    name: 'New Balance',
    logo: '/images/brands/new-balance.png',
    description: 'Fearlessly Independent Since 1906. Thương hiệu giày thể thao chất lượng cao.',
    rating: 4.7,
    productsCount: 450,
    features: ['Premium Quality', 'Comfort', 'Innovation', 'Heritage'],
    isPremium: true,
    isTrending: true,
    isNew: false,
    featured: true,
    status: 'active'
  },
  {
    name: 'ASICS',
    logo: '/images/brands/asics.png',
    description: 'Sound Mind, Sound Body. Thương hiệu giày chạy bộ hàng đầu.',
    rating: 4.6,
    productsCount: 380,
    features: ['Performance', 'Technology', 'Comfort', 'Innovation'],
    isPremium: true,
    isTrending: false,
    isNew: false,
    featured: false,
    status: 'active'
  },
  {
    name: 'Reebok',
    logo: '/images/brands/reebok.png',
    description: 'Be More Human. Thương hiệu thể thao với lịch sử lâu đời.',
    rating: 4.4,
    productsCount: 320,
    features: ['Heritage', 'Style', 'Performance', 'Premium Quality'],
    isPremium: false,
    isTrending: false,
    isNew: false,
    featured: false,
    status: 'active'
  },
  {
    name: 'Converse',
    logo: '/images/brands/converse.png',
    description: 'Shoes Are Boring. Wear Sneakers. Thương hiệu giày sneaker cổ điển.',
    rating: 4.3,
    productsCount: 280,
    features: ['Heritage', 'Style', 'Comfort', 'Heritage'],
    isPremium: false,
    isTrending: false,
    isNew: false,
    featured: false,
    status: 'active'
  }
];

const seedBrands = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing brands
    await Brand.deleteMany({});
    console.log('Cleared existing brands');

    // Insert new brands
    const result = await Brand.insertMany(sampleBrands);
    console.log(`Seeded ${result.length} brands successfully`);

    // Log each brand
    result.forEach(brand => {
      console.log(`- ${brand.name}`);
    });

    console.log('Brand seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding brands:', error);
    process.exit(1);
  }
};

seedBrands(); 