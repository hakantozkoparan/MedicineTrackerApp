export const COLORS = {
  // Yeşil Tonları
  primary: '#4CAF50', // Canlı Yeşil
  secondary: '#81C784', // Sakin Yeşil
  accent: '#2E7D32', // Koyu Yeşil (Vurgu)

  // Nötr Renkler
  white: '#FFFFFF',
  lightGray: '#F5F5F5', // Arka Plan
  gray: '#E0E0E0', // Ayırıcılar
  darkGray: '#555555', // Metin
  dark: '#333333', // Koyu metin
  
  // Diğer Renkler
  danger: '#FF3B30',
  error: '#FF3B30',
  warning: '#FFCC00',
  lightWarning: '#FFF9E6',
  success: '#34C759',
  background: '#F8F9FA',
  
  // Yeşil tonları için lightGreen
  lightGreen: '#E8F5E8',
  lightPrimary: '#E8F5E8',
};

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  xxLarge: 30,
  h1: 32,
  radius: 12,
  padding: 16,
};

export const FONTS = {
  bold: "Poppins-Bold",
  semiBold: "Poppins-SemiBold",
  regular: "Poppins-Regular",
  
  // Font styles
  h1: { fontSize: 32, fontFamily: "Poppins-Bold" },
  h2: { fontSize: 24, fontFamily: "Poppins-Bold" },
  h3: { fontSize: 20, fontFamily: "Poppins-SemiBold" },
  body1: { fontSize: 18, fontFamily: "Poppins-Regular" },
  body2: { fontSize: 16, fontFamily: "Poppins-Regular" },
  body3: { fontSize: 14, fontFamily: "Poppins-Regular" },
  body4: { fontSize: 12, fontFamily: "Poppins-Regular" },
  caption: { fontSize: 10, fontFamily: "Poppins-Regular" },
};

const appTheme = { COLORS, SIZES, FONTS };

export default appTheme;
