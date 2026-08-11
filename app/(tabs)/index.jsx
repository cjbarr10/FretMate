import { Redirect } from 'expo-router';

// Not a real tab (hidden via href:null). Exists only because Expo Router needs
// a route for the group's root path.
export default function Index() {
  return <Redirect href="/scales" />;
}
