import { useState, useCallback } from "react";
import { BleClient, BleDevice, BleService } from "@capacitor-community/bluetooth-le";
import { Bluetooth, Search, Unplug, Eye, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { CommissioningData } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: React.Dispatch<React.SetStateAction<CommissioningData>>;
}

interface DiscoveredCharacteristic {
  serviceUuid: string;
  characteristicUuid: string;
  properties: string[];
  lastValue?: string;
  rawBytes?: number[];
}

// Known Testo BLE name prefixes
const TESTO_NAME_PREFIXES = ["testo", "Testo", "T550", "T557", "T558", "T570"];

const isTestoDevice = (device: BleDevice): boolean => {
  if (!device.name) return false;
  return TESTO_NAME_PREFIXES.some((p) => device.name!.startsWith(p));
};

const bytesToHex = (bytes: DataView): string => {
  const arr: string[] = [];
  for (let i = 0; i < bytes.byteLength; i++) {
    arr.push(bytes.getUint8(i).toString(16).padStart(2, "0"));
  }
  return arr.join(" ");
};

const tryParseFloat = (bytes: DataView, offset: number, littleEndian = true): number | null => {
  if (offset + 4 > bytes.byteLength) return null;
  try {
    const val = bytes.getFloat32(offset, littleEndian);
    if (isFinite(val) && Math.abs(val) < 1000) return Math.round(val * 100) / 100;
    return null;
  } catch {
    return null;
  }
};

const tryParseInt16AsTemp = (bytes: DataView, offset: number, littleEndian = true): number | null => {
  if (offset + 2 > bytes.byteLength) return null;
  try {
    const val = bytes.getInt16(offset, littleEndian) / 10;
    if (isFinite(val) && Math.abs(val) < 200) return val;
    return null;
  } catch {
    return null;
  }
};

const TestoBLE = ({ data, setData }: Props) => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [services, setServices] = useState<BleService[]>([]);
  const [characteristics, setCharacteristics] = useState<DiscoveredCharacteristic[]>([]);
  const [listening, setListening] = useState(false);
  const [liveValues, setLiveValues] = useState<Map<string, { hex: string; floats: (number | null)[]; int16s: (number | null)[] }>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      return true;
    } catch (err: any) {
      setError(`BLE init mislukt: ${err.message}`);
      return false;
    }
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    const ok = await initialize();
    if (!ok) return;

    setScanning(true);
    setDevices([]);

    try {
      await BleClient.requestLEScan(
        { allowDuplicates: false },
        (result) => {
          if (result.device.name) {
            setDevices((prev) => {
              if (prev.find((d) => d.deviceId === result.device.deviceId)) return prev;
              return [...prev, result.device];
            });
          }
        }
      );

      // Stop scan after 10 seconds
      setTimeout(async () => {
        try { await BleClient.stopLEScan(); } catch {}
        setScanning(false);
      }, 10000);
    } catch (err: any) {
      setScanning(false);
      setError(`Scan mislukt: ${err.message}`);
    }
  }, [initialize]);

  const connect = useCallback(async (device: BleDevice) => {
    setError(null);
    try {
      await BleClient.stopLEScan();
      setScanning(false);
    } catch {}

    try {
      await BleClient.connect(device.deviceId, (deviceId) => {
        if (deviceId === device.deviceId) {
          setConnectedDevice(null);
          setServices([]);
          setCharacteristics([]);
          toast({ title: "Verbinding verbroken", description: device.name || device.deviceId });
        }
      });

      setConnectedDevice(device);
      toast({ title: "Verbonden!", description: device.name || device.deviceId });

      // Discover services
      const svc = await BleClient.getServices(device.deviceId);
      setServices(svc);

      // Flatten characteristics
      const chars: DiscoveredCharacteristic[] = [];
      for (const s of svc) {
        for (const c of s.characteristics) {
          const props: string[] = [];
          if (c.properties.read) props.push("read");
          if (c.properties.write) props.push("write");
          if (c.properties.notify) props.push("notify");
          if (c.properties.indicate) props.push("indicate");
          if (c.properties.writeWithoutResponse) props.push("writeNoResp");
          chars.push({
            serviceUuid: s.uuid,
            characteristicUuid: c.uuid,
            properties: props,
          });
        }
      }
      setCharacteristics(chars);
    } catch (err: any) {
      setError(`Verbinden mislukt: ${err.message}`);
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    if (!connectedDevice) return;
    try {
      await BleClient.disconnect(connectedDevice.deviceId);
    } catch {}
    setConnectedDevice(null);
    setServices([]);
    setCharacteristics([]);
    setListening(false);
    setLiveValues(new Map());
  }, [connectedDevice]);

  const readCharacteristic = useCallback(async (char: DiscoveredCharacteristic) => {
    if (!connectedDevice) return;
    try {
      const result = await BleClient.read(connectedDevice.deviceId, char.serviceUuid, char.characteristicUuid);
      const hex = bytesToHex(result);
      const floats: (number | null)[] = [];
      const int16s: (number | null)[] = [];
      for (let i = 0; i <= result.byteLength - 4; i += 4) floats.push(tryParseFloat(result, i));
      for (let i = 0; i <= result.byteLength - 2; i += 2) int16s.push(tryParseInt16AsTemp(result, i));

      setLiveValues((prev) => {
        const next = new Map(prev);
        next.set(char.characteristicUuid, { hex, floats, int16s });
        return next;
      });
    } catch (err: any) {
      toast({ title: "Leesfout", description: err.message, variant: "destructive" });
    }
  }, [connectedDevice, toast]);

  const startNotifications = useCallback(async () => {
    if (!connectedDevice) return;
    setListening(true);

    for (const char of characteristics) {
      if (char.properties.includes("notify") || char.properties.includes("indicate")) {
        try {
          await BleClient.startNotifications(
            connectedDevice.deviceId,
            char.serviceUuid,
            char.characteristicUuid,
            (value) => {
              const hex = bytesToHex(value);
              const floats: (number | null)[] = [];
              const int16s: (number | null)[] = [];
              for (let i = 0; i <= value.byteLength - 4; i += 4) floats.push(tryParseFloat(value, i));
              for (let i = 0; i <= value.byteLength - 2; i += 2) int16s.push(tryParseInt16AsTemp(value, i));

              setLiveValues((prev) => {
                const next = new Map(prev);
                next.set(char.characteristicUuid, { hex, floats, int16s });
                return next;
              });
            }
          );
        } catch {}
      }
    }

    toast({ title: "Luisteren gestart", description: "Ontvang live data van alle notify characteristics" });
  }, [connectedDevice, characteristics, toast]);

  const stopNotifications = useCallback(async () => {
    if (!connectedDevice) return;
    for (const char of characteristics) {
      if (char.properties.includes("notify") || char.properties.includes("indicate")) {
        try {
          await BleClient.stopNotifications(connectedDevice.deviceId, char.serviceUuid, char.characteristicUuid);
        } catch {}
      }
    }
    setListening(false);
  }, [connectedDevice, characteristics]);

  return (
    <div className="space-y-4">
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Bluetooth className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm">
          <strong>Testo BLE Sniffer</strong> — Scan, verbind en ontdek de BLE services van je Testo instrument. De gevonden data kun je direct overnemen als meetwaarden.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scan / Connect controls */}
      {!connectedDevice ? (
        <div className="space-y-3">
          <Button onClick={scan} disabled={scanning} className="w-full h-12">
            <Search className="h-4 w-4 mr-2" />
            {scanning ? "Scannen..." : "Scan voor Testo apparaten"}
          </Button>

          {devices.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Gevonden apparaten ({devices.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-2">
                {devices
                  .sort((a, b) => (isTestoDevice(b) ? 1 : 0) - (isTestoDevice(a) ? 1 : 0))
                  .map((d) => (
                    <Button
                      key={d.deviceId}
                      variant={isTestoDevice(d) ? "default" : "outline"}
                      className="w-full justify-between h-12"
                      onClick={() => connect(d)}
                    >
                      <span className="truncate">{d.name || "Onbekend"}</span>
                      {isTestoDevice(d) && <Badge className="ml-2 bg-green-600">Testo</Badge>}
                    </Button>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected header */}
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">{connectedDevice.name}</span>
                <Badge variant="outline" className="text-green-600 border-green-500">Verbonden</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <Unplug className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Notification controls */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={listening ? "destructive" : "default"}
              onClick={listening ? stopNotifications : startNotifications}
              className="h-10"
            >
              <Zap className="h-4 w-4 mr-1" />
              {listening ? "Stop luisteren" : "Start live data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => characteristics.filter((c) => c.properties.includes("read")).forEach(readCharacteristic)}
              className="h-10"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Lees alles
            </Button>
          </div>

          {/* Services & Characteristics */}
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Services & Characteristics ({characteristics.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-2">
                  {characteristics.map((char) => {
                    const val = liveValues.get(char.characteristicUuid);
                    return (
                      <Card key={`${char.serviceUuid}-${char.characteristicUuid}`} className="border-muted">
                        <CardContent className="p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <code className="text-[10px] text-muted-foreground truncate flex-1">
                              {char.characteristicUuid.substring(0, 8)}...
                            </code>
                            <div className="flex gap-1 ml-2">
                              {char.properties.map((p) => (
                                <Badge key={p} variant="outline" className="text-[9px] px-1 py-0">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {char.properties.includes("read") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs w-full"
                              onClick={() => readCharacteristic(char)}
                            >
                              Lees waarde
                            </Button>
                          )}

                          {val && (
                            <div className="bg-muted/50 rounded p-2 space-y-1">
                              <div className="text-[10px] font-mono text-muted-foreground break-all">
                                HEX: {val.hex}
                              </div>
                              {val.floats.some((f) => f !== null) && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Float32: </span>
                                  {val.floats.filter((f) => f !== null).map((f, i) => (
                                    <Badge key={i} className="mr-1 text-xs">{f}</Badge>
                                  ))}
                                </div>
                              )}
                              {val.int16s.some((v) => v !== null) && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Int16/10: </span>
                                  {val.int16s.filter((v) => v !== null).map((v, i) => (
                                    <Badge key={i} variant="outline" className="mr-1 text-xs">{v}°</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TestoBLE;
