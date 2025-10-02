// Check if dotenv is available before importing, with a fallback
let dotenvConfig = () => { };
try {
  // Attempt to load dotenv if installed
  dotenvConfig = require('dotenv').config;
  dotenvConfig();
} catch (e) {
  console.warn('dotenv not found or failed to load. Using default environment variables.');
  // Fallback: Use process.env directly, assuming CI/CD provides them
}

export default {
  expo: {
    name: "Teddy's Cleaning",
    slug: "teddys-cleaning-app",
    version: "1.0.0",
    scheme: "teddys-cleaning-app",
    orientation: "portrait",
    platforms: ["ios", "android", "web"],
    description: "Professional cleaning services app with smart booking, real-time tracking, and eco-friendly solutions.",
    privacy: "public",
    extra: {
      eas: {
        projectId: "c462a4e2-94d4-403a-9f68-1efb0fbb3d98"
      },
      // Environment variables with fallbacks
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    },
    icon: "./assets/favicon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#4facfe"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.teddyscleaning.app",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses location to find nearby cleaning services and provide accurate service estimates.",
        NSCameraUsageDescription: "This app uses camera to take photos for service documentation and quality assurance.",
        NSPhotoLibraryUsageDescription: "This app accesses photo library to attach images to service requests and feedback.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "teddys-cleaning-app",
            CFBundleURLSchemes: ["teddys-cleaning-app"]
          }
        ]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      package: "com.teddyscleaning.app",
      adaptiveIcon: {
        foregroundImage: "./assets/favicon.png",
        backgroundColor: "#4facfe"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "teddyscleaning.com"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#4facfe",
          defaultChannel: "default",
          sounds: [
            "./assets/sounds/Future.mp3"
          ]
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow Teddy's Cleaning to use your location to find nearby cleaning services."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to attach images to service requests and feedback.",
          cameraPermission: "The app uses camera to take photos for service documentation."
        }
      ]
    ],
    updates: {
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: {
      policy: "sdkVersion"
    }
  }
};