# Expense Manager Mobile App

A React Native mobile application for iOS and Android built with Expo, allowing users to manage and submit expense claims on the go.

## Features

- **Authentication**: Secure login using Supabase Auth
- **My Expenses**: View all expense claims with status indicators
- **Create Claims**: Create new expense claims with date ranges and client selection
- **Add Expenses**: Add expenses to claims with:
  - Camera integration for receipt photos
  - Photo library selection
  - Category selection
  - VAT amount tracking
- **Submit Claims**: Submit draft claims for approval
- **Real-time Updates**: Pull-to-refresh functionality

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Supabase** for backend (database, storage, authentication)
- **Expo Camera & Image Picker** for receipt capture

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Studio (for Android development)
- Expo Go app on your physical device (optional)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Environment Variables**

   Create a `.env` file in the mobile directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   Use the same Supabase credentials from your web application.

3. **Start the Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Simulator**

   - **iOS Simulator**: Press `i` in the terminal
   - **Android Emulator**: Press `a` in the terminal
   - **Physical Device**: Scan the QR code with Expo Go app

## Project Structure

```
mobile/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication state management
│   ├── lib/
│   │   └── supabase.ts           # Supabase client configuration
│   └── screens/
│       ├── LoginScreen.tsx       # User authentication
│       ├── ClaimsListScreen.tsx  # List of expense claims
│       ├── ClaimDetailsScreen.tsx # Individual claim details
│       ├── CreateClaimScreen.tsx # Create new claim form
│       └── AddExpenseScreen.tsx  # Add expense with camera
├── App.tsx                        # Main app component with navigation
├── app.json                       # Expo configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript configuration
```

## Key Screens

### Login Screen
- Email and password authentication
- Secure session management with Expo SecureStore

### Claims List Screen
- View all claims (draft, submitted, approved, rejected)
- Status badges with color coding
- Pull-to-refresh functionality
- Create new claim button

### Claim Details Screen
- View claim information and all expenses
- Add expenses to draft claims
- Submit claims for approval
- View total amount

### Add Expense Screen
- Capture receipt photos with camera
- Select photos from library
- Enter expense details (title, amount, VAT, category)
- Upload receipts to Supabase Storage

### Create Claim Screen
- Enter claim description
- Set date range
- Select client (optional)
- Creates draft claim for adding expenses

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

For detailed build instructions, see [Expo Build Documentation](https://docs.expo.dev/build/introduction/).

## Permissions Required

- **Camera**: For taking receipt photos
- **Photo Library**: For selecting existing photos
- **Storage**: For storing session data securely

## Notes

- Admin features are not included in the mobile app
- Claims can only be submitted, not approved via mobile
- Admins should use the web dashboard for approvals and management
- All data syncs with the same Supabase database as the web app

## Troubleshooting

### Camera not working
- Ensure permissions are granted in device settings
- Check that camera permissions are properly configured in app.json

### Build errors
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Supabase connection issues
- Verify environment variables are set correctly
- Check that Supabase project is accessible
- Ensure RLS policies allow mobile access

## Support

For issues or questions, please refer to:
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Supabase Documentation](https://supabase.com/docs)
