# KhataTrack

Offline-first expense tracker built for Indian users. Track income and expenses in Hindi or English, with ₹ formatting, UPI categories, and optional bank SMS auto-import.

## Features

- **100% free & offline** — all data stored locally in SQLite on your device
- **Hindi + English** UI with Indian number formatting (lakhs/crores)
- **Manual transactions** — fast numpad entry with India-specific categories (chai, kirana, rent)
- **Bank SMS import (Android)** — scan HDFC, SBI, UPI SMS; review before saving
- **Analytics** — expense breakdown, UPI vs cash chart, income vs expense
- **Backup & restore** — export JSON/CSV, share via WhatsApp
- **Monthly budgets** — set limits with progress bars
- **Recurring reminders** — rent, EMI, recharge (local notifications)
- **Split expenses** — divide bills among friends, share summary
- **App lock** — biometric/PIN protection

## Tech Stack (all free)

- Expo SDK 54 + React Native
- expo-sqlite (local database)
- zustand + AsyncStorage
- i18next (Hindi/English)
- react-native-get-sms-android (SMS, Android dev build only)

## Setup

```bash
npm install
npm start
```

Then scan the QR code with **Expo Go** on your phone (same Wi‑Fi as your PC).

> **QR does nothing?** You may have started in dev-client mode. Use `npm start` (Expo Go), not `npm run start:dev`.

### Android with SMS (bank SMS import)

SMS reading does **not** work in Expo Go. Install a dev build on your phone:

```bash
npx expo run:android
```

Open the **KhataTrack** app on your phone (not Expo Go), then run `npm run start:dev` on your PC.

Grant SMS permission when prompted. All parsing happens on-device — nothing is sent to any server.

## Privacy

See [PRIVACY.md](PRIVACY.md). KhataTrack does not collect, transmit, or store your data on any cloud service.

## Play Store Notes

- SMS permission is used only to read bank transaction messages for expense tracking
- Data never leaves the device
- Users review all SMS imports before saving

## License

Private project — free for personal use.

© 2026 Anurag Verma. All rights reserved.
