import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function ExploreScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/leaderboard');
  }, []);

  return null;
}
