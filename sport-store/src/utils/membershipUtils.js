// Membership tier configuration (matching frontend)
const MEMBERSHIP_TIERS = [
  {
    name: "Đồng",
    color: "#9C7F7F",
    icon: "🥉",
    minSpent: 0,
    maxSpent: 2000000
  },
  {
    name: "Bạc", 
    color: "#797979",
    icon: "🥈",
    minSpent: 2000000,
    maxSpent: 5000000
  },
  {
    name: "Vàng",
    color: "#FFBE00",
    icon: "⭐",
    minSpent: 5000000,
    maxSpent: 10000000
  },
  {
    name: "Bạch Kim",
    color: "#4EB09D",
    icon: "👑",
    minSpent: 10000000, 
    maxSpent: 50000000
  },
  {
    name: "Kim Cương",
    color: "#7C54F3",
    icon: "💎",
    minSpent: 50000000,
    maxSpent: Infinity
  }
];

const getMembershipTier = (totalSpent = 0) => {
  if (totalSpent >= 50000000) {
    return MEMBERSHIP_TIERS[4]; // Kim Cương
  } else if (totalSpent >= 10000000) {
    return MEMBERSHIP_TIERS[3]; // Bạch Kim
  } else if (totalSpent >= 5000000) {
    return MEMBERSHIP_TIERS[2]; // Vàng
  } else if (totalSpent >= 2000000) {
    return MEMBERSHIP_TIERS[1]; // Bạc
  } else {
    return MEMBERSHIP_TIERS[0]; // Đồng
  }
};

export {
  MEMBERSHIP_TIERS,
  getMembershipTier
}; 