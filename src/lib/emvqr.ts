import { BuildParams, MAI28, AddlData } from './types';

// Fix: Add and export PLATFORM_BIC to resolve import error in SimpleGenerator.
export const PLATFORM_BIC: { [key: string]: string } = {
  cbe: 'CBETETAA',
};

const byteLen = (s: string) => new TextEncoder().encode(s).length;
const pad2 = (n: number) => n.toString().padStart(2, "0");
const len2 = (s: string) => pad2(byteLen(s));
const tlv = (tag: string, value: string) => value ? `${tag}${len2(value)}${value}` : '';

const truncateBytes = (s: string, maxBytes: number) => {
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  if (bytes.length <= maxBytes) return s;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0b11000000) === 0b10000000) end--; // avoid mid-codepoint
  return new TextDecoder().decode(bytes.slice(0, end));
};

const randomHex32 = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export const crc16CCITTFALSE = (input: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const buildMAI28 = (mai: MAI28): string => {
  const subs: string[] = [];
  subs.push(tlv("00", mai.guid || randomHex32()));
  subs.push(tlv("01", mai.bic));
  subs.push(tlv("02", mai.accountOrPhone));
  return tlv("28", subs.join(""));
}

// Fix: Update build62 to handle all fields in the extended AddlData type.
const build62 = (addl?: AddlData): string => {
  if (!addl) return "";
  const parts: string[] = [];
  if (addl.billNumber) parts.push(tlv("01", addl.billNumber));
  if (addl.mobileNumber) parts.push(tlv("02", addl.mobileNumber));
  if (addl.storeLabel) parts.push(tlv("03", addl.storeLabel));
  if (addl.referenceLabel) parts.push(tlv("05", addl.referenceLabel));
  if (addl.terminalLabel) parts.push(tlv("07", addl.terminalLabel));
  if (addl.purpose) parts.push(tlv("08", addl.purpose));
  return parts.length ? tlv("62", parts.join("")) : "";
}

export const buildEMVQR = (p: BuildParams): string => {
  const name = truncateBytes(p.merchantName, 25);
  const city = truncateBytes(p.merchantCity, 15);

  const pieces: string[] = [];
  pieces.push(tlv("00", "01"));
  pieces.push(tlv("01", p.poiMethod));
  pieces.push(buildMAI28(p.mai28));
  if (p.mcc) pieces.push(tlv("52", p.mcc));
  pieces.push(tlv("53", p.currency ?? "230"));
  if (p.amount) pieces.push(tlv("54", p.amount));
  pieces.push(tlv("58", p.countryCode ?? "ET"));
  pieces.push(tlv("59", name));
  pieces.push(tlv("60", city));

  const t62 = build62(p.addl);
  if (t62) pieces.push(t62);

  const body = pieces.join("");

  if (!body) return "";

  const crc = crc16CCITTFALSE(body + "6304");
  return body + "6304" + crc;
}
