import { useCallback, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Camera as CameraIcon, Keyboard, X } from "lucide-react-native";

import { Camera } from "@/lib/nativeModules";
import { useFeature } from "@/context/FeatureFlagsContext";
import { explainFeature } from "@/lib/features";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import { PRESS_SCALE } from "@/lib/motion";

// `expo-camera`'s `CameraView` isn't native-only: on web it drives the browser's
// `getUserMedia` feed and decodes frames itself (see `expo-camera`'s
// `ExpoCamera.web.js`), so the same component and the same `onBarcodeScanned`
// callback cover a phone's camera and a laptop's webcam without a platform
// branch here.
//
// The split into a gate and an implementation below is deliberate:
// `useCameraPermissions` is a hook, and hooks can't be called conditionally. If
// the camera module is unreachable — or switched off in the dev flag panel —
// the component that calls that hook must never mount at all, which means the
// decision has to happen one level up, in a component with no camera hooks of
// its own.

export default function ScanQr({ navigation }) {
  const feature = useFeature("qrScanner");

  return (
    <Screen edges={["top", "bottom"]} statusBarStyle="light" fullBleed className="bg-black">
      <View className="flex-1">
        {feature.enabled ? <CameraScanner /> : <ManualEntry feature={feature} />}

        <PressableScale
          onPress={() => navigation?.goBack()}
          scale={PRESS_SCALE.tight}
          accessibilityLabel="Close scanner"
          className="absolute left-4 top-4 size-10 items-center justify-center rounded-full bg-black/50"
        >
          <X size={22} color="#FFFFFF" />
        </PressableScale>
      </View>
    </Screen>
  );
}

// Everything that touches `expo-camera` lives below this line, so nothing here
// is evaluated unless the module resolved.
function CameraScanner() {
  const { CameraView, useCameraPermissions } = Camera;
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const scanLockRef = useRef(false);

  const handleBarcodeScanned = useCallback(({ data }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScannedData(data);
  }, []);

  const rescan = () => {
    scanLockRef.current = false;
    setScannedData(null);
  };

  if (!permission?.granted) {
    return <PermissionPrompt permission={permission} onRequest={requestPermission} />;
  }

  return (
    <CameraView
      className="flex-1"
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
    >
      <ScanOverlay scannedData={scannedData} onRescan={rescan} />
    </CameraView>
  );
}

// The fallback is a working way in, not an apology screen. Emulators have no
// usable camera, and a scan flow reachable only by pointing a real phone at a
// real printed code is a flow nobody tests — so the code can be typed. Same
// result panel, same rescan, so everything downstream of a scan is exercised by
// exactly the same path.
function ManualEntry({ feature }) {
  const [code, setCode] = useState("");
  const [scannedData, setScannedData] = useState(null);

  if (scannedData) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <ScanResult
          scannedData={scannedData}
          onRescan={() => {
            setScannedData(null);
            setCode("");
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="size-16 items-center justify-center rounded-full bg-white/10">
        <Keyboard size={28} color="#FFFFFF" />
      </View>

      <Text className="text-center font-jakarta-semibold text-[17px] text-white">
        Enter the code instead
      </Text>

      {/* The reason, verbatim from the flag registry — "camera unavailable" and
          "you switched the scanner off two days ago" are not the same problem
          and shouldn't read the same. */}
      <Text className="text-center font-jakarta-medium text-[14px] text-white/70">
        {explainFeature(feature)}
      </Text>

      <Input
        value={code}
        onChangeText={setCode}
        placeholder="Table or storefront code"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => code.trim() && setScannedData(code.trim())}
        className="mt-2"
      />

      <Button
        onPress={() => code.trim() && setScannedData(code.trim())}
        variant={code.trim() ? "default" : "disabled"}
        className="w-full"
      >
        Continue
      </Button>
    </View>
  );
}

function ScanOverlay({ scannedData, onRescan }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="size-64 rounded-3xl border-2 border-white/80" />

      {scannedData ? (
        <View className="absolute bottom-16 w-full items-center gap-4 px-6">
          <ScanResult scannedData={scannedData} onRescan={onRescan} />
        </View>
      ) : (
        <Text className="absolute bottom-16 px-8 text-center font-jakarta-medium text-[14px] text-white">
          Line up the QR code inside the frame
        </Text>
      )}
    </View>
  );
}

function ScanResult({ scannedData, onRescan }) {
  return (
    <View className="w-full items-center gap-4">
      <View className="w-full rounded-2xl bg-white p-4">
        <Text className="font-jakarta-semibold text-[13px] text-muted-foreground">Scanned</Text>
        <Text className="mt-1 font-jakarta-medium text-[15px] text-foreground" numberOfLines={3}>
          {scannedData}
        </Text>
      </View>
      <Button onPress={onRescan} className="w-full">
        Scan again
      </Button>
    </View>
  );
}

function PermissionPrompt({ permission, onRequest }) {
  // `permission` is null for the first render while the check is in flight —
  // asking for camera access before we know it's already been denied would
  // flash a button the OS is about to refuse anyway.
  if (!permission) return null;

  const canAskAgain = permission.canAskAgain !== false;

  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="size-16 items-center justify-center rounded-full bg-white/10">
        <CameraIcon size={28} color="#FFFFFF" />
      </View>
      <Text className="text-center font-jakarta-semibold text-[17px] text-white">
        Camera access needed
      </Text>
      <Text className="text-center font-jakarta-medium text-[14px] text-white/70">
        Yulo Stores needs your camera to scan QR codes for quick ordering.
      </Text>
      <Button onPress={canAskAgain ? onRequest : () => Linking.openSettings?.()} className="mt-2">
        {canAskAgain
          ? "Allow camera access"
          : Platform.OS === "web"
            ? "Enable in browser settings"
            : "Open settings"}
      </Button>
    </View>
  );
}
