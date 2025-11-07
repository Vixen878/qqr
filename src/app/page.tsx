/* ================================= app/page.tsx ================================= */
"use client";
import { useEffect, useMemo, useState } from "react";
import { buildEMVQR, PLATFORM_BIC, type POIMethod } from "@/lib/emvqr";

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring ${props.className ?? ""}`} />
);

export default function Page() {
  const [platform, setPlatform] = useState<"telebirr" | "cbe" | "custom">("telebirr");
  const [bic, setBic] = useState(PLATFORM_BIC["telebirr"]);
  const [poiMethod, setPoiMethod] = useState<POIMethod>("11"); // static by default
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("MULUKEN TADESSE GIZAW");
  const [city, setCity] = useState("Addis Ababa");
  const [acctOrPhone, setAcctOrPhone] = useState("0911309991");
  const [mcc, setMcc] = useState("7999");
  const [purpose, setPurpose] = useState("Goods/Services");
  const [payload, setPayload] = useState("");

  useEffect(() => {
    if (platform === "custom") return; // don't override manual BIC
    setBic(PLATFORM_BIC[platform]);
  }, [platform]);

  const qrPayload = useMemo(() => {
    const p = buildEMVQR({
      poiMethod,
      merchantName: name,
      merchantCity: city,
      currency: "230",
      mcc,
      amount: poiMethod === "12" && amount ? amount : undefined,
      mai28: { bic, accountOrPhone: acctOrPhone },
      addl: { purpose, mobileNumber: acctOrPhone },
    });
    return p;
  }, [poiMethod, name, city, mcc, amount, bic, acctOrPhone, purpose]);

  useEffect(() => setPayload(qrPayload), [qrPayload]);

  const qrURL = `/api/qr?payload=${encodeURIComponent(payload)}`;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">IPS‑ET Interoperable QR Generator</h1>
      <p className="mb-6 text-sm text-gray-600">Build EMVCo‑compliant payloads for Telebirr, CBE, or custom PSPs and preview as a QR.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Platform</label>
          <div className="flex gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              className="w-1/2 rounded-lg border px-3 py-2 text-sm"
            >
              <option value="telebirr">Telebirr</option>
              <option value="cbe">CBE</option>
              <option value="custom">Custom</option>
            </select>
            <Input placeholder="BIC (e.g., EBIRETAA)" value={bic} onChange={(e) => setBic(e.target.value)} disabled={platform !== "custom"} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm">POI Method</label>
              <select value={poiMethod} onChange={(e) => setPoiMethod(e.target.value as POIMethod)} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="11">Static (11)</option>
                <option value="12">Dynamic (12)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Amount (Tag 54)</label>
              <Input placeholder="e.g., 150.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={poiMethod !== "12"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm">Merchant Name (≤25B)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">City (≤15B)</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm">Account / Phone (Tag 28/02)</label>
              <Input value={acctOrPhone} onChange={(e) => setAcctOrPhone(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">MCC (Tag 52)</label>
              <Input value={mcc} onChange={(e) => setMcc(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Purpose (62/08 or use Tag 80)</label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(payload)}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
            >Copy Payload</button>
            <a
              href={qrURL}
              download="qr.svg"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >Download QR (SVG)</a>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">QR Preview</label>
          <div className="rounded-xl border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrURL} alt="QR" className="mx-auto h-auto w-64" />
          </div>
          <label className="mb-2 mt-4 block text-sm font-medium">Raw Payload</label>
          <textarea className="h-40 w-full rounded-lg border p-2 text-xs" readOnly value={payload} />
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p><strong>Notes:</strong> Country=ET (Tag 58), Currency=230 (Tag 53). Keep Name ≤25 bytes and City ≤15 bytes. Tag 28 includes sub‑tags 00 (GUID), 01 (BIC), 02 (account/phone). CRC is auto‑computed (Tag 63).</p>
      </div>
    </div>
  );
}
