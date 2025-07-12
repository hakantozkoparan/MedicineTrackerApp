import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background, // Match the app's background
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          height: 120, // Increase header height
        },
        headerTitleStyle: {
          fontFamily: 'Poppins-Bold',
          fontSize: SIZES.extraLarge,
          color: COLORS.accent,
        },


        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.darkGray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.lightGray,
          height: 90,
          paddingBottom: 30,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 12,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'alert-circle-outline';
          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'medicines') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false, // Hide header to use custom one in the screen
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: 'İlaçlarım',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontFamily: FONTS.bold,
            fontSize: SIZES.extraLarge,
            color: COLORS.accent,
            marginLeft: SIZES.large,
          },
          headerRight: () => {
            const router = useRouter();
            return (
              <TouchableOpacity style={{ marginRight: SIZES.large }} onPress={() => router.push('/add-medicine')}>
                <Ionicons name="add-circle" size={32} color={COLORS.primary} />
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontFamily: FONTS.bold,
            fontSize: SIZES.extraLarge,
            color: COLORS.accent,
            marginLeft: SIZES.large,
          },
        }}
      />
    </Tabs>
  );
}
