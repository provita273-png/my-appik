import { TonConnectUIProvider } from "@tonconnect/ui-react";
import RadaStickersMiniApp from "./RadaStickersMiniApp";

const manifestUrl = `${window.location.origin}${import.meta.env.BASE_URL}tonconnect-manifest.json`;

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <RadaStickersMiniApp />
    </TonConnectUIProvider>
  );
}
