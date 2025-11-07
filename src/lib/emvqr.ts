// README: IPS‑ET EMVCo QR Generator (Telebirr, CBE, etc.)
// -------------------------------------------------------
// This mini Next.js (App Router) app lets users enter merchant details
// (name, city, phone/account) and outputs a valid Interoperable QR payload
// (EMVCo profile for Ethiopia / IPS‑ET) plus a scannable SVG QR.
//
// ✅ Platforms: Telebirr (EBIRETAA), CBE (CBETETAA), or custom BIC.
// ✅ Correct TLV building with UTF‑8 byte lengths.
// ✅ CRC‑16/CCITT‑FALSE calculation (Tag 63).
// ✅ Static (Tag 01 = 11) or Dynamic (12) with optional amount (Tag 54).
//
// Quick start
// 1) Create a fresh Next.js app (App Router):
//    npx create-next-app@latest qr-ips-et --ts --app --tailwind
//    cd qr-ips-et
// 2) Install deps:
//    npm i qrcode
// 3) Create the three files below.
// 4) npm run dev → open http://localhost:3000
//
// ─────────────────────────────────────────────────────────────────────────────
// File structure
// ├─ app/
// │  ├─ api/
// │  │  └─ qr/route.ts            # Returns SVG QR from a payload (GET ?payload=...)
// │  └─ page.tsx                  # UI form to build payload + preview QR
// └─ lib/
//    └─ emvqr.ts                  # EMV/IPS‑ET TLV builder + CRC
// ─────────────────────────────────────────────────────────────────────────────

/* ============================ lib/emvqr.ts ============================ */
export type POIMethod = "11" | "12"; // 11=static, 12=dynamic

export type AddlData = {
  billNumber?: string;        // 62/01
  mobileNumber?: string;      // 62/02
  storeLabel?: string;        // 62/03
  referenceLabel?: string;    // 62/05
  purpose?: string;           // 62/08 (or use Tag 80 instead)
  addlConsumerReq?: ("A"|"M"|"E")[]; // 62/09 aggregate flags
  merchantTaxId?: string;     // 62/10
  merchantChannel?: string;   // 62/11 (e.g., "POS")
};

export type MAI28 = {
  bic: string;                // e.g., EBIRETAA, CBETETAA (8 or 11 chars)
  accountOrPhone: string;     // wallet phone or merchant account identifier
  guid?: string;              // IPS‑ET GUID (UUID32 hex, no hyphens). Auto if omitted
  legacyGui?: string;         // For legacy GUIs like "00136327" if your PSP requires
};

export type BuildParams = {
  poiMethod: POIMethod;                 // 11 or 12
  merchantName: string;                 // Tag 59 (≤25 bytes)
  merchantCity: string;                 // Tag 60 (≤15 bytes)
  countryCode?: "ET";                   // Tag 58 (default ET)
  currency?: "230";                     // Tag 53 (default 230 = ETB)
  mcc?: string;                         // Tag 52 (optional, e.g., 7999)
  amount?: string;                      // Tag 54 (only if dynamic or you want fixed amount)
  mai28: MAI28;                         // Tag 28 sub‑template
  addl?: AddlData;                      // Tag 62
  context80?: string;                   // Tag 80 free text context (optional)
};

const byteLen = (s: string) => new TextEncoder().encode(s).length;
const pad2 = (n: number) => n.toString().padStart(2, "0");
const len2 = (s: string) => pad2(byteLen(s));
const tlv = (tag: string, value: string) => `${tag}${len2(value)}${value}`;

// Truncate to maxBytes without breaking UTF‑8
const truncateBytes = (s: string, maxBytes: number) => {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  if (bytes.length <= maxBytes) return s;
  // Walk back until within limit
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0b11000000) === 0b10000000) end--; // avoid mid‑codepoint
  return new TextDecoder().decode(bytes.slice(0, end));
};

// Poor‑man's 32‑hex GUID (UUID without hyphens). Replace with crypto if desired.
const randomHex32 = () => Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join("");

// CRC‑16/CCITT‑FALSE (poly 0x1021, init 0xFFFF)
export function crc16CCITTFALSE(input: string): string {
  let crc = 0xffff;
  for (let i=0; i<input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let j=0; j<8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildMAI28(mai: MAI28): string {
  const subs: string[] = [];
  if (mai.legacyGui) subs.push(tlv("00", mai.legacyGui));
  else if (mai.guid) subs.push(tlv("00", mai.guid));
  else subs.push(tlv("00", randomHex32()));
  subs.push(tlv("01", mai.bic));
  subs.push(tlv("02", mai.accountOrPhone));
  return tlv("28", subs.join(""));
}

function build62(addl?: AddlData): string {
  if (!addl) return "";
  const parts: string[] = [];
  if (addl.billNumber)      parts.push(tlv("01", addl.billNumber));
  if (addl.mobileNumber)    parts.push(tlv("02", addl.mobileNumber));
  if (addl.storeLabel)      parts.push(tlv("03", addl.storeLabel));
  if (addl.referenceLabel)  parts.push(tlv("05", addl.referenceLabel));
  if (addl.purpose)         parts.push(tlv("08", addl.purpose));
  if (addl.addlConsumerReq?.length) parts.push(tlv("09", addl.addlConsumerReq.join("")));
  if (addl.merchantTaxId)   parts.push(tlv("10", addl.merchantTaxId));
  if (addl.merchantChannel) parts.push(tlv("11", addl.merchantChannel));
  return parts.length ? tlv("62", parts.join("")) : "";
}

export function buildEMVQR(p: BuildParams): string {
  const name = truncateBytes(p.merchantName, 25);
  const city = truncateBytes(p.merchantCity, 15);

  const pieces: string[] = [];
  pieces.push(tlv("00", "01"));                 // EMV v1
  pieces.push(tlv("01", p.poiMethod));           // 11=static, 12=dynamic
  pieces.push(buildMAI28(p.mai28));               // IPS‑ET Tag 28
  if (p.mcc) pieces.push(tlv("52", p.mcc));
  pieces.push(tlv("53", p.currency ?? "230"));  // ETB
  if (p.amount) pieces.push(tlv("54", p.amount));
  pieces.push(tlv("58", p.countryCode ?? "ET"));
  pieces.push(tlv("59", name));
  pieces.push(tlv("60", city));

  const t62 = build62(p.addl);
  if (t62) pieces.push(t62);
  if (p.context80) pieces.push(tlv("80", p.context80));

  const body = pieces.join("");
  const forCRC = body + "6304" + "0000";
  const crc = crc16CCITTFALSE(forCRC);
  return body + "6304" + crc;
}

export const PLATFORM_BIC: Record<string, string> = {
  telebirr: "EBIRETAA",
  cbe: "CBETETAA",
};





