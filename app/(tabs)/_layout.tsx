import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Hide all headers by default, we will use custom ones
        headerShown: false, 
        
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
        title: 'Ana sayfa'  // No options needed here as header is hidden globally
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          // We need to define the title for the tab bar label
          title: 'İlaçlarım',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          // We need to define the title for the tab bar label
          title: 'Profil',
        }}
      />
    </Tabs>
  );
}
