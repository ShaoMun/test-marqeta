# React Native NFC Payment Reader App

This guide shows you how to build a **cross-platform React Native app** that can read NFC cards/NTAG tags and process payments using your Marqeta JIT Funding system.

## 🎯 Architecture

```
NFC Card/Tag (with payment data)
        ↓ TAP
React Native App (NFC Reader)
        ↓
   Your Marqeta API
        ↓
   JIT Funding
        ↓
 Transaction Complete ✓
```

## 📱 What You'll Build

A React Native app (Android + iOS) that:
1. **Reads NFC tags/cards** with payment data
2. **Extracts card information** (card token, amount)
3. **Calls your Marqeta API** to process payment
4. **Shows transaction result** with JIT funding confirmation

## 🛠️ Requirements

### Hardware
- Android phone with NFC (Android 5.0+)
- iOS device (iPhone 7+, iOS 11+)
- NFC tags or NTAG cards:
  - **NTAG215** (~$10-20 for 10 tags) - Recommended
  - **NTAG213** (cheaper, less memory)
  - **Mifare Classic 1K** (works but older tech)

### Software
- Node.js
- React Native CLI or Expo
- iOS: Xcode (for Mac) or use Expo
- Android: Android Studio

## 📂 Project Setup

### 1. Create New React Native Project

**Using React Native CLI:**
```bash
npx react-native@latest init NfcPaymentReader
cd NfcPaymentReader
```

**Using Expo (Recommended):**
```bash
npx create-expo-app NfcPaymentReader
cd NfcPaymentReader
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install react-native-nfc-manager
npm install axios

# For Expo users
npx expo install expo-nfc

# iOS setup
cd ios && pod install && cd ..
```

### 3. Configure Android

**`android/app/src/main/AndroidManifest.xml`:**
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nfcpaymentreader">

    <uses-permission android:name="android.permission.NFC" />
    <uses-feature android:name="android.hardware.nfc" android:required="false" />

    <application
        android:usesCleartextTraffic="true">
        ...
    </application>
</manifest>
```

**`android/app/build.gradle`:**
```gradle
dependencies {
    implementation 'com.facebook.react:react-native:+'
    implementation "com.github.invertase:react-native-nfc-manager:3.14.5"
}
```

### 4. Configure iOS

**`ios/NfcPaymentReader/Info.plist`:**
```xml
<key>NFCReaderUsageDescription</key>
<string>This app needs NFC to read payment cards</string>
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
    <string>NDEF</string>
</array>
```

Add to `Podfile`:
```ruby
pod 'react-native-nfc-manager', :path => '../node_modules/react-native-nfc-manager'
```

Then run:
```bash
cd ios && pod install && cd ..
```

## 💻 Core Implementation

### App.tsx (Complete Implementation)

```typescript
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  NativeModules,
  Platform
} from 'react-native';
import NfcManager, { NdefParser, NfcTech } from 'react-native-nfc-manager';
import axios from 'axios';

// Your Marqeta API base URL (update with your computer's IP)
const MARQETA_API_BASE = 'http://YOUR_COMPUTER_IP:3000';

export default function App() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready to scan NFC card/tag');
  const [lastPayment, setLastPayment] = useState<any>(null);

  useEffect(() => {
    // Check NFC support
    NfcManager.isSupported()
      .then(supported => {
        setSupported(supported);
        if (supported) {
          console.log('NFC is supported');
        } else {
          setStatus('NFC not supported on this device');
        }
      })
      .catch(err => console.log('NFC check error:', err));

    // Cleanup on unmount
    return () => {
      NfcManager.cancelTechnologyRequest();
    };
  }, []);

  const readNfc = async () => {
    try {
      setLoading(true);
      setStatus('Waiting for NFC tag...');

      await NfcManager.start();

      // Register listener for NDEF tags
      const tag = await NfcManager.requestTechnology(NfcTech.Ndef);

      // Read NDEF message
      const ndef = await NfcManager.getNdefMessage();
      console.log('NDEF records:', ndef);

      if (ndef && ndef.length > 0) {
        // Parse NDEF record
        const parser = new NdefParser();
        const payload = parser.parse(ndef[0].payload);

        // Parse JSON data from NFC tag
        const paymentData = JSON.parse(payload);
        console.log('Payment data:', paymentData);

        // Process payment
        await processPayment(paymentData);
      } else {
        setStatus('No data found on NFC tag');
      }

    } catch (ex: any) {
      console.warn('NFC read error:', ex);
      setStatus(`Error: ${ex.message}`);
    } finally {
      setLoading(false);
      await NfcManager.cancelTechnologyRequest();
    }
  };

  const processPayment = async (paymentData: any) => {
    try {
      setStatus('Processing payment...');

      const { cardToken, amount } = paymentData;

      // Call Marqeta One-Click Pay API
      const response = await axios.post(
        `${MARQETA_API_BASE}/api/marqeta/one-click-pay`,
        {
          cardToken,
          amount: parseFloat(amount),
          autoClear: true
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      if (response.data.success) {
        const transaction = response.data.data.transaction;
        setStatus(`✓ Payment Successful! $${(amount).toFixed(2)}`);
        setLastPayment({
          amount,
          state: transaction.state,
          token: transaction.token,
          responseCode: transaction.response?.code,
          timestamp: new Date().toISOString()
        });

        Alert.alert(
          'Payment Successful',
          `Amount: $${parseFloat(amount).toFixed(2)}\nState: ${transaction.state}`,
          [{ text: 'OK' }]
        );
      } else {
        setStatus(`Payment failed: ${response.data.error}`);
        Alert.alert('Payment Failed', response.data.error);
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus(`Payment error: ${error.message}`);
      Alert.alert('Payment Error', error.message);
    }
  };

  const testPayment = async () => {
    // Test payment without NFC
    const testData = {
      cardToken: 'test_card_token',
      amount: 10.00,
      timestamp: Date.now()
    };
    await processPayment(testData);
  };

  if (!supported) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>NFC is not supported on this device</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💳 NFC Payment Reader</Text>
        <Text style={styles.subtitle}>Tap NFC tag to process payment</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={readNfc}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '📡 Scanning...' : '📱 Scan NFC Tag'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={testPayment}
      >
        <Text style={styles.buttonText}>🧪 Test Payment (No NFC)</Text>
      </TouchableOpacity>

      {lastPayment && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Last Payment</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Amount:</Text>
            <Text style={styles.resultValue}>
              ${(lastPayment.amount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>State:</Text>
            <Text style={[
              styles.resultValue,
              lastPayment.state === 'CLEARED' && styles.success
            ]}>
              {lastPayment.state} {lastPayment.state === 'CLEARED' && '✓'}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Response:</Text>
            <Text style={styles.resultValue}>{lastPayment.responseCode}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Time:</Text>
            <Text style={styles.resultValueSmall}>
              {new Date(lastPayment.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How to Use:</Text>
        <Text style={styles.infoText}>
          1. Write payment data to NFC tag (see below)
        </Text>
        <Text style={styles.infoText}>
          2. Tap "Scan NFC Tag" button
        </Text>
        <Text style={styles.infoText}>
          3. Hold NFC tag near phone
        </Text>
        <Text style={styles.infoText}>
          4. Payment processes automatically
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#c7d2fe',
    marginTop: 5,
  },
  statusCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a5a5a5',
  },
  buttonSecondary: {
    backgroundColor: '#6366f1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  resultLabel: {
    color: '#047857',
    fontSize: 14,
  },
  resultValue: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultValueSmall: {
    color: '#065f46',
    fontSize: 12,
  },
  success: {
    color: '#059669',
  },
  infoCard: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 5,
  },
  error: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
    padding: 20,
  },
});
```

## 🏷️ Writing Data to NFC Tags

### Method 1: Using NFC Tools App (Easiest)

1. **Install NFC Tools app** (Android/iOS)
2. **Write data to tag**:
   - Open NFC Tools
   - Select "Write" → "Add record"
   - Type: Text
   - Data: Your JSON payment data
   - Write tag

**Example data to write:**
```json
{
  "cardToken": "card_44336802_i6xi",
  "amount": 10.00,
  "timestamp": 1737871234567
}
```

### Method 2: Using Your React Native App (Advanced)

Add this function to your `App.tsx`:

```typescript
const writeToNfc = async (cardToken: string, amount: number) => {
  try {
    await NfcManager.start();

    const paymentData = {
      cardToken,
      amount,
      timestamp: Date.now()
    };

    // Create NDEF record with JSON data
    const bytes = NfcManager.encodeNdefMessage([
      Ndef.textRecord(JSON.stringify(paymentData))
    ]);

    await NfcManager.requestTechnology(NfcTech.Ndef);

    // Wait for tag and write
    const tag = await NfcManager.getTag();
    await NfcManager.writeNdefMessage(bytes);

    Alert.alert('Success', 'Data written to NFC tag!');
    await NfcManager.cancelTechnologyRequest();

  } catch (error: any) {
    console.error('Write error:', error);
    Alert.alert('Error', 'Failed to write to NFC tag');
    await NfcManager.cancelTechnologyRequest();
  }
};
```

## 🔧 Important Configurations

### 1. Your Computer's IP Address

Find your IP and update in `App.tsx`:
```bash
# On Mac
ipconfig getifaddr en0

# On Windows
ipconfig

# On Linux
ip addr show
```

Then update in code:
```typescript
const MARQETA_API_BASE = 'http://192.168.1.X:3000';
```

### 2. Enable HTTP Traffic (Android)

Already configured in `AndroidManifest.xml` above with `usesCleartextTraffic`.

### 3. iOS NFC Entitlements

Add in Xcode:
1. Open `ios/NfcPaymentReader.xcworkspace`
2. Select target → Signing & Capabilities
3. Add "Near Field Communication Tag Reading"
4. Select "NDEF" format

## 🎯 Usage Flow

### 1. Setup Your Marqeta System
```
1. Run: npm install
2. Run: npm run dev
3. Go to: http://localhost:3000/marqeta
4. Click "Setup JIT Funding"
5. Copy your card token
```

### 2. Prepare NFC Tag
```
1. Open NFC Tools app
2. Click "Write"
3. Add record → Text
4. Paste your JSON payment data
5. Write to NFC tag
```

### 3. Test Payment
```
1. Run React Native app
2. Click "Scan NFC Tag" (or test without NFC)
3. Tap NFC tag on phone
4. App reads data automatically
5. Calls your Marqeta API
6. Transaction processes with JIT funding
7. Shows result!
```

## 🚀 Running the App

### Android:
```bash
npm run android
# or
npx react-native run-android
```

### iOS:
```bash
npm run ios
# or
npx react-native run-ios
```

### Expo:
```bash
npx expo start
# Then scan QR code with Expo Go app
```

## 🌍 Cross-Platform Features

| Feature | Android | iOS |
|---------|---------|-----|
| Read NFC Tags | ✅ | ✅ (iPhone 7+) |
| Write NFC Tags | ✅ | ⚠️ Limited |
| NDEF Format | ✅ | ✅ |
| Background Scanning | ✅ | ❌ |

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-nfc-manager": "^3.14.5",
    "axios": "^1.6.0"
  }
}
```

## 🎨 Advanced Features (Optional)

### Add Payment History
```typescript
const [paymentHistory, setPaymentHistory] = useState([]);

const saveToHistory = (payment: any) => {
  setPaymentHistory([payment, ...paymentHistory].slice(0, 10));
};
```

### Add Sound/Haptic Feedback
```typescript
import { Vibration } from 'react-native';
import Sound from 'react-native-sound';

const playSuccessSound = () => {
  Vibration.vibrate(100);
  // Play success sound
};
```

### Add Biometric Auth
```typescript
import TouchID from 'react-native-touch-id';

const authenticate = async () => {
  try {
    const success = await TouchID.authenticate('Authenticate to process payment');
    return success;
  } catch (error) {
    return false;
  }
};
```

## 🔗 Integration Points

Your React Native app connects to:
- **[lib/marqeta.ts](lib/marqeta.ts)** - Marqeta API functions
- **[/api/marqeta/one-click-pay.ts](pages/api/marqeta/one-click-pay.ts)** - Auto-clear payment endpoint

Both are already implemented in your Next.js app!

## 📱 Resources

- [React Native NFC Manager Docs](https://github.com/whitedogg13/react-native-nfc-manager)
- [Expo NFC Docs](https://docs.expo.dev/versions/latest/sdk/nfc/)
- [Marqeta Core API Docs](https://www.marqeta.com/developer)

## ⚡ Quick Start

1. Create React Native project
2. Install `react-native-nfc-manager` and `axios`
3. Copy the `App.tsx` code
4. Configure Android/iOS permissions
5. Update your computer's IP
6. Run app on phone
7. Scan NFC tag to test!

Your React Native NFC reader app will process payments through your Marqeta JIT Funding system with auto-clear! 🎉
