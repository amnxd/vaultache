# Firebase Studio

This is a Next.js starter project configured for use within Firebase Studio.

This project allows you to build and deploy web applications with the power of Next.js and Firebase.

## Getting Started

1.  **Install Dependencies:** Open your terminal or command prompt and navigate to the project directory. Run the following command to install all the necessary libraries:

```

2.  **Configure Firebase:**
    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   Add a web app to your project and copy the Firebase configuration snippet.
    *   Create a file named `.env.local` in the root of your project and add your Firebase configuration as environment variables. For example:

    ```dotenv
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
    ```

3.  **Run the Development Server:**

```bash
npm run dev
