import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="home/index"
        options={{
          title: '首頁',
          tabBarLabel: '首頁',
        }}
      />
    </Tabs>
  );
}
