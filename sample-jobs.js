// Sample jobs with Melbourne coordinates for testing
// Run this in Firebase console or add manually to test map functionality

const sampleJobs = [
  {
    title: "Melbourne CBD Office Complex",
    client: "TechCorp Australia",
    address: "123 Collins Street, Melbourne VIC 3000",
    coordinates: {
      latitude: -37.8136,
      longitude: 144.9631
    },
    scheduledDate: "2024-01-15",
    startTime: "9:00 AM",
    priority: "High",
    status: "Scheduled",
    progress: 0,
    notes: "Large office complex with 5 floors. Focus on reception areas and meeting rooms.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Southbank Apartment Cleaning",
    client: "Luxury Living Properties",
    address: "456 Southbank Boulevard, Southbank VIC 3006",
    coordinates: {
      latitude: -37.8226,
      longitude: 144.9648
    },
    scheduledDate: "2024-01-16",
    startTime: "2:00 PM",
    priority: "Medium",
    status: "In Progress",
    progress: 45,
    notes: "High-end apartment complex. Use premium cleaning supplies only.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Richmond Factory Warehouse",
    client: "Industrial Solutions Ltd",
    address: "789 Swan Street, Richmond VIC 3121",
    coordinates: {
      latitude: -37.8197,
      longitude: 144.9937
    },
    scheduledDate: "2024-01-14",
    startTime: "6:00 AM",
    priority: "Low",
    status: "Completed",
    progress: 100,
    notes: "Industrial cleaning required. Safety equipment mandatory.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "St Kilda Beach Cafe",
    client: "Seaside Hospitality Group",
    address: "321 Acland Street, St Kilda VIC 3182",
    coordinates: {
      latitude: -37.8677,
      longitude: 144.9778
    },
    scheduledDate: "2024-01-17",
    startTime: "11:00 AM",
    priority: "High",
    status: "Scheduled",
    progress: 0,
    notes: "Beach-front cafe. Extra attention to salt air damage on surfaces.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Docklands Corporate Tower",
    client: "Harbor View Enterprises",
    address: "555 Docklands Drive, Docklands VIC 3008",
    coordinates: {
      latitude: -37.8183,
      longitude: 144.9536
    },
    scheduledDate: "2024-01-18",
    startTime: "7:30 AM",
    priority: "Medium",
    status: "Scheduled",
    progress: 0,
    notes: "Modern corporate building. Focus on glass surfaces and lobby areas.",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Instructions:
// 1. Go to Firebase Console
// 2. Navigate to Firestore Database
// 3. Create a new collection called "jobs"
// 4. Add each job as a new document
// 5. The coordinates will enable map functionality in the app

export default sampleJobs;