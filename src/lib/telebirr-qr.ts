// telebirr-qr.ts
// Unofficial Telebirr QR parser for the Base64 blobs you shared.
// Heuristic but works on your samples.

type Parsed = {
    version?: string;
    mode?: 'receive' | 'unknown';
    id?: string;
    amount?: string;        // keep as string to avoid locale/decimal quirks
    signatureTailHex?: string;
    rawHex: string;
    phone?: string;         // extracted from EMV Track 2 (tag 57), if present
};

function toHex(buf: Buffer) {
    return buf.toString('hex').toUpperCase();
}

function findAsciiRun(buf: Buffer, minLen = 8, charset = /[0-9]/): { start: number; end: number; text: string } | null {
    let start = -1;
    for (let i = 0; i < buf.length; i++) {
        const ch = buf[i];
        const ok = ch >= 0x20 && ch <= 0x7E && charset.test(String.fromCharCode(ch));
        if (ok) {
            if (start === -1) start = i;
        } else if (start !== -1) {
            const end = i;
            if (end - start >= minLen) {
                return { start, end, text: buf.toString('ascii', start, end) };
            }
            start = -1;
        }
    }
    if (start !== -1 && buf.length - start >= minLen) {
        const end = buf.length;
        return { start, end, text: buf.toString('ascii', start, end) };
    }
    return null;
}

function parseAmountTLV(buf: Buffer): { amount?: string; tlvStart?: number; tlvEnd?: number } {
    // Look for tag 0x9F24 (two-byte tag: 0x9F, 0x24)
    for (let i = 0; i < buf.length - 3; i++) {
        if (buf[i] === 0x9F && buf[i + 1] === 0x24) {
            const len = buf[i + 2];
            const vStart = i + 3;
            const vEnd = vStart + len;
            if (vEnd <= buf.length) {
                const valAscii = buf.slice(vStart, vEnd).toString('ascii');
                return { amount: valAscii, tlvStart: i, tlvEnd: vEnd };
            }
        }
    }
    return {};
}

function parseVersion(buf: Buffer): string | undefined {
    // Simple TLV: 0x85 length 5 -> "CPV01"
    for (let i = 0; i < buf.length - 7; i++) {
        if (buf[i] === 0x85 && buf[i + 1] === 0x05) {
            const v = buf.slice(i + 2, i + 7).toString('ascii');
            if (/^CPV0[0-9]$/.test(v)) return v;
        }
    }
    return undefined;
}

function parseMode(buf: Buffer): 'receive' | 'unknown' {
    // We observed 'R' 0x0D as a marker before the ID
    for (let i = 0; i < buf.length - 1; i++) {
        if (buf[i] === 0x52 /*'R'*/ && buf[i + 1] === 0x0D) return 'receive';
    }
    return 'unknown';
}

// Decode EMV Track 2 (tag 0x57): BCD digits, 'D' delimiter between PAN and rest
function parseTrack2Phone(buf: Buffer): string | undefined {
    for (let i = 0; i < buf.length - 2; i++) {
        if (buf[i] === 0x57) {
            const len = buf[i + 1];
            const vStart = i + 2;
            const vEnd = vStart + len;
            if (vEnd <= buf.length) {
                const v = buf.slice(vStart, vEnd);
                let digits = '';
                for (const b of v) {
                    const hi = (b >> 4) & 0xF;
                    const lo = b & 0xF;
                    const nibbleToChar = (n: number) => {
                        if (n === 0xD) return 'D';       // field delimiter
                        if (n === 0xF) return '';        // filler
                        return n.toString(16).toUpperCase();
                    };
                    digits += nibbleToChar(hi) + nibbleToChar(lo);
                }
                const dPos = digits.indexOf('D');
                const pan = dPos >= 0 ? digits.slice(0, dPos) : digits;
                // For Telebirr, PAN appears to be '+2519xxxxxxx' without plus sign in digits
                // Sanity check: starts with '2519' and length ~12–13
                if (/^2519\d{7,9}$/.test(pan)) return pan;
                return undefined;
            }
        }
    }
    return undefined;
}

// Update or remove amount (tag 9F24) inside the 0x61 container and keep lengths consistent
function setAmountInBlob(b64: string, nextAmount?: string): string {
    const buf = Buffer.from(b64.trim(), 'base64');

    // Find the 0x61 container (short-form length assumed)
    let idx61 = -1;
    for (let i = 0; i < buf.length - 1; i++) {
        if (buf[i] === 0x61) { idx61 = i; break; }
    }
    if (idx61 === -1) throw new Error('TLV container 0x61 not found');
    const oldLen = buf[idx61 + 1];
    const vStart = idx61 + 2;
    const vEnd = vStart + oldLen;

    // Locate existing 9F24
    let idxAmt = -1;
    let oldAmtLen = 0;
    for (let i = vStart; i <= vEnd - 3; i++) {
        if (buf[i] === 0x9F && buf[i + 1] === 0x24) {
            idxAmt = i;
            oldAmtLen = buf[i + 2];
            break;
        }
    }

    const hasAmount = typeof nextAmount === 'string' && nextAmount.trim().length > 0;
    if (hasAmount) {
        const val = Buffer.from(nextAmount!.trim(), 'ascii');
        const tlv = Buffer.concat([Buffer.from([0x9F, 0x24, val.length]), val]);

        let out: Buffer;
        if (idxAmt >= 0) {
            // Replace existing
            const oldEnd = idxAmt + 3 + oldAmtLen;
            out = Buffer.concat([buf.slice(0, idxAmt), tlv, buf.slice(oldEnd)]);
            const delta = tlv.length - (3 + oldAmtLen);
            out[idx61 + 1] = oldLen + delta;
        } else {
            // Insert before container end
            out = Buffer.concat([buf.slice(0, vEnd), tlv, buf.slice(vEnd)]);
            out[idx61 + 1] = oldLen + tlv.length;
        }
        return out.toString('base64');
    } else {
        // Remove amount if present
        if (idxAmt >= 0) {
            const oldEnd = idxAmt + 3 + oldAmtLen;
            const out = Buffer.concat([buf.slice(0, idxAmt), buf.slice(oldEnd)]);
            out[idx61 + 1] = oldLen - (3 + oldAmtLen);
            return out.toString('base64');
        }
        return b64.trim();
    }
}

function parseTelebirrBase64(b64: string): Parsed {
    const buf = Buffer.from(b64.trim(), 'base64');
    const rawHex = toHex(buf);

    const version = parseVersion(buf);
    const mode = parseMode(buf);

    // Find a long run of ASCII digits as the account/merchant ID (11–16 digits works for your samples)
    const idRun = findAsciiRun(buf, 11, /[0-9]/);

    // Amount TLV (9F24)
    const { amount, tlvEnd } = parseAmountTLV(buf);

    // Extract phone from EMV Track 2 (tag 57)
    const phone = parseTrack2Phone(buf);

    // Signature/MAC tail = bytes after amount TLV (if found), else bytes after the ID run (best-effort)
    let signatureTailHex: string | undefined;
    if (typeof tlvEnd === 'number') {
        const tail = buf.slice(tlvEnd);
        if (tail.length > 0) signatureTailHex = toHex(tail);
    } else if (idRun) {
        const tail = buf.slice(idRun.end);
        if (tail.length > 0) signatureTailHex = toHex(tail);
    }

    return {
        version,
        mode,
        id: idRun?.text,
        amount,
        signatureTailHex,
        rawHex,
        phone,
    };
}

// ---- demo with your two samples ----
const s1 = 'hQVDUFYwMWE+TwLwUg0xNzU2NTcxMTE2NTExVxYlGREwmZHSUIEBUA==';
// const s2 = 'hQVDUFYwMWFITwLwUg0xNzU2NTcxMTQ2OTkwVxYlGREwmZHSUIEBUJ8kAjEw';
// const s2 = 'hQVDUFYwMWFQTwLwUg0xNzU2NjQ1ODc5MzQ0VxYlGQJSNljSUIEBUJ8kBjMwMC4wMA=='

const s2 = 'hQVDUFYwMWFITwLwUg0xNzYyMTgwNTkzMzgxVxYlGTgFNAXSUREBUJ8kAjI1'
const s3 = 'hQVDUFYwMWFQTwLwUg0xNzYyNTI0NDA3OTQ3VxYlGQJSNljSUREBUJ8kBjUwMC4wMA==';

console.log('Decoded #1:', parseTelebirrBase64(s1));
console.log('Decoded #2:', parseTelebirrBase64(s2));
console.log('Decoded #3:', parseTelebirrBase64(s3));

// Example: generate a new QR for the same receiver as s3 with amount 250.00
const s3_with_250 = setAmountInBlob(s3, '250.00');
console.log('Decoded #3 (250):', parseTelebirrBase64(s3_with_250));
