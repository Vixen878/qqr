/* ============================== app/structured/page.tsx ============================== */
"use client";
import { useMemo, useState } from "react";
import { crc16CCITTFALSE, PLATFORM_BIC } from "@/lib/emvqr";

// Local TLV helpers (client-side)
const byteLen = (s: string) => new TextEncoder().encode(s).length;
const len2 = (s: string) => byteLen(s).toString().padStart(2, "0");
const tlv = (tag: string, value: string) => `${tag}${len2(value)}${value}`;

type Layout = "cbe" | "spec";

export default function StructuredPage() {
    // Defaults from your sample structure
    const [poiMethod] = useState("11");
    const [bic, setBic] = useState(PLATFORM_BIC.cbe); // CBETETAA
    const [guid, setGuid] = useState("1000612736468");
    const [account, setAccount] = useState("1000612736468");
    const [mcc, setMcc] = useState("0000");
    const [currency] = useState("230");
    const [country] = useState("ET");
    const [name, setName] = useState("NAHOM SOLOMON ABERA");
    const [city, setCity] = useState("city");
    const [mobile, setMobile] = useState("+251-906630353");
    const [purpose, setPurpose] = useState("Payment for services");
    const [channel, setChannel] = useState("CBE Mobile Banking");
    const [store, setStore] = useState("cbeSt");
    const [terminal, setTerminal] = useState("cbeTi");
    const [amount, setAmount] = useState("500");
    const [context80, setContext80] = useState("Pay");
    const [layout, setLayout] = useState<Layout>("cbe"); // tag order toggle

    // Toggles to include/exclude sections
    const [incGuid, setIncGuid] = useState(true);               // 28/00
    const [incMCC, setIncMCC] = useState(true);                 // 52
    const [incAmount, setIncAmount] = useState(true);           // 54
    const [incName, setIncName] = useState(true);               // 59
    const [incCity, setIncCity] = useState(true);               // 60
    const [inc62Mobile, setInc62Mobile] = useState(true);       // 62/02
    const [inc62Purpose, setInc62Purpose] = useState(true);     // 62/08
    const [inc62Channel, setInc62Channel] = useState(true);     // 62/11
    const [inc62Store, setInc62Store] = useState(true);         // 62/03
    const [inc62Terminal, setInc62Terminal] = useState(true);   // 62/07
    const [inc80, setInc80] = useState(true);                   // 80

    // Build payload with selectable tag order:
    // spec: 00,01,28,52,53,54,58,59,60,62,80,63
    // cbe : 00,01,28,52,53,58,59,60,62,54,80,63
    const payload = useMemo(() => {
        const parts: string[] = [];
        parts.push(tlv("00", "01"));            // Payload Format Indicator
        parts.push(tlv("01", poiMethod));       // Static/Dynamic

        // Tag 28 (Merchant Account Information - IPS-ET)
        const mai: string[] = [];
        if (incGuid) mai.push(tlv("00", guid)); // GUID
        mai.push(tlv("01", bic));               // BIC (e.g., CBETETAA)
        mai.push(tlv("02", account));           // Merchant account / phone
        parts.push(tlv("28", mai.join("")));

        if (incMCC) parts.push(tlv("52", mcc)); // MCC
        parts.push(tlv("53", currency));        // Currency (230 = ETB)

        // spec layout puts 54 before 58/59/60/62
        if (layout === "spec" && incAmount) parts.push(tlv("54", amount));

        parts.push(tlv("58", country));         // Country
        if (incName) parts.push(tlv("59", name));
        if (incCity) parts.push(tlv("60", city));

        const t62: string[] = [];
        if (inc62Mobile) t62.push(tlv("02", mobile));
        if (inc62Purpose) t62.push(tlv("08", purpose));
        if (inc62Channel) t62.push(tlv("11", channel));
        if (inc62Store) t62.push(tlv("03", store));
        if (inc62Terminal) t62.push(tlv("07", terminal));
        if (t62.length) parts.push(tlv("62", t62.join("")));

        // cbe layout puts 54 after 62
        if (layout === "cbe" && incAmount) parts.push(tlv("54", amount));

        if (inc80) parts.push(tlv("80", context80));

        const body = parts.join("");
        const crc = crc16CCITTFALSE(body + "6304" + "");
        return body + "6304" + crc;
    }, [
        poiMethod, layout, incGuid, guid, bic, account, incMCC, mcc, currency,
        incAmount, amount, country, incName, name, incCity, city,
        inc62Mobile, mobile, inc62Purpose, purpose, inc62Channel, channel,
        inc62Store, store, inc62Terminal, terminal, inc80, context80
    ]);

    const qrURL = `/api/qr?payload=${encodeURIComponent(payload)}`;

    // Build a short human-readable list of the included segments (e.g., 5919Name, 6004City, 6282...)
    const includedLines = useMemo(() => {
        const lines: string[] = [];
        // spec: show 54 before 62
        if (layout === "spec" && incAmount) lines.push("54" + len2(amount) + amount);

        if (incName) lines.push("59" + len2(name) + name);
        if (incCity) lines.push("60" + len2(city) + city);

        if (inc62Mobile || inc62Purpose || inc62Channel || inc62Store || inc62Terminal) {
            const subs: string[] = [];
            if (inc62Mobile) subs.push("02" + len2(mobile) + mobile);
            if (inc62Purpose) subs.push("08" + len2(purpose) + purpose);
            if (inc62Channel) subs.push("11" + len2(channel) + channel);
            if (inc62Store) subs.push("03" + len2(store) + store);
            if (inc62Terminal) subs.push("07" + len2(terminal) + terminal);
            const inner = subs.join("");
            lines.push("62" + len2(inner) + inner);
        }

        // cbe: show 54 after 62
        if (layout === "cbe" && incAmount) lines.push("54" + len2(amount) + amount);

        if (inc80) lines.push("80" + len2(context80) + context80);
        return lines;
    }, [
        layout, incName, name, incCity, city,
        inc62Mobile, mobile, inc62Purpose, purpose, inc62Channel, channel,
        inc62Store, store, inc62Terminal, terminal,
        incAmount, amount, inc80, context80
    ]);

    // UI
    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="mb-2 text-2xl font-semibold">Structured QR Builder (toggle sections)</h1>
            <p className="mb-6 text-sm text-gray-600">
                Generate a CBE-style payload and include/exclude specific TLV segments like <code>59</code> (Name), <code>60</code> (City), <code>62/02</code> (Mobile), etc.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <fieldset className="rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Core Routing (Tag 28)</legend>
                        <div className="mb-2 grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-xs">BIC (28/01)</label>
                                <input className="w-full rounded-lg border px-2 py-1 text-sm" value={bic} onChange={(e) => setBic(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs">Account / Phone (28/02)</label>
                                <input className="w-full rounded-lg border px-2 py-1 text-sm" value={account} onChange={(e) => setAccount(e.target.value)} />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={incGuid} onChange={(e) => setIncGuid(e.target.checked)} />
                            <span>Include GUID (28/00)</span>
                        </label>
                        {incGuid && (
                            <div className="mt-2">
                                <input className="w-full rounded-lg border px-2 py-1 text-sm" value={guid} onChange={(e) => setGuid(e.target.value)} />
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Merchant Info</legend>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input id="toggle-name" type="checkbox" checked={incName} onChange={(e) => setIncName(e.target.checked)} />
                                <label htmlFor="toggle-name" className="text-sm">Name (59)</label>
                                {incName && (
                                    <input
                                        aria-label="Name (59)"
                                        placeholder="Name (59)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-city" type="checkbox" checked={incCity} onChange={(e) => setIncCity(e.target.checked)} />
                                <label htmlFor="toggle-city" className="text-sm">City (60)</label>
                                {incCity && (
                                    <input
                                        aria-label="City (60)"
                                        placeholder="City (60)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Transaction & Locale</legend>

                        {/* Tag order toggle */}
                        <div className="mb-2">
                            <label className="mb-1 block text-xs">Tag Order</label>
                            <select
                                value={layout}
                                onChange={(e) => setLayout(e.target.value as Layout)}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            >
                                <option value="cbe">CBE layout (54 after 62)</option>
                                <option value="spec">Spec-ascending (54 before 58/59/60/62)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input id="toggle-mcc" type="checkbox" checked={incMCC} onChange={(e) => setIncMCC(e.target.checked)} />
                                <label htmlFor="toggle-mcc" className="text-sm">MCC (52)</label>
                                {incMCC && (
                                    <input
                                        aria-label="MCC (52)"
                                        placeholder="MCC (52)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={mcc}
                                        onChange={(e) => setMcc(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-amount" type="checkbox" checked={incAmount} onChange={(e) => setIncAmount(e.target.checked)} />
                                <label htmlFor="toggle-amount" className="text-sm">Amount (54)</label>
                                {incAmount && (
                                    <input
                                        aria-label="Amount (54)"
                                        placeholder="Amount (54)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Currency (53):</span> {currency}</div>
                            <div><span className="text-gray-500">Country (58):</span> {country}</div>
                        </div>
                    </fieldset>

                    <fieldset className="rounded-lg border p-4">
                        <legend className="px-1 text-sm font-medium">Additional Data (62) & Context (80)</legend>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input id="toggle-62-mobile" type="checkbox" checked={inc62Mobile} onChange={(e) => setInc62Mobile(e.target.checked)} />
                                <label htmlFor="toggle-62-mobile" className="text-sm">Mobile (62/02)</label>
                                {inc62Mobile && (
                                    <input
                                        aria-label="Mobile (62/02)"
                                        placeholder="Mobile (62/02)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-62-purpose" type="checkbox" checked={inc62Purpose} onChange={(e) => setInc62Purpose(e.target.checked)} />
                                <label htmlFor="toggle-62-purpose" className="text-sm">Purpose (62/08)</label>
                                {inc62Purpose && (
                                    <input
                                        aria-label="Purpose (62/08)"
                                        placeholder="Purpose (62/08)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-62-channel" type="checkbox" checked={inc62Channel} onChange={(e) => setInc62Channel(e.target.checked)} />
                                <label htmlFor="toggle-62-channel" className="text-sm">Channel (62/11)</label>
                                {inc62Channel && (
                                    <input
                                        aria-label="Channel (62/11)"
                                        placeholder="Channel (62/11)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-62-store" type="checkbox" checked={inc62Store} onChange={(e) => setInc62Store(e.target.checked)} />
                                <label htmlFor="toggle-62-store" className="text-sm">Store (62/03)</label>
                                {inc62Store && (
                                    <input
                                        aria-label="Store (62/03)"
                                        placeholder="Store (62/03)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={store}
                                        onChange={(e) => setStore(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-62-terminal" type="checkbox" checked={inc62Terminal} onChange={(e) => setInc62Terminal(e.target.checked)} />
                                <label htmlFor="toggle-62-terminal" className="text-sm">Terminal (62/07)</label>
                                {inc62Terminal && (
                                    <input
                                        aria-label="Terminal (62/07)"
                                        placeholder="Terminal (62/07)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={terminal}
                                        onChange={(e) => setTerminal(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="toggle-80" type="checkbox" checked={inc80} onChange={(e) => setInc80(e.target.checked)} />
                                <label htmlFor="toggle-80" className="text-sm">Top-level Context (80)</label>
                                {inc80 && (
                                    <input
                                        aria-label="Top-level Context (80)"
                                        placeholder="Top-level Context (80)"
                                        className="ml-auto w-full rounded-lg border px-2 py-1 text-sm"
                                        value={context80}
                                        onChange={(e) => setContext80(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(payload)} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">Copy Payload</button>
                        <a href={qrURL} download="qr.svg" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Download QR (SVG)</a>
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

                    <label className="mb-2 mt-4 block text-sm font-medium">Included Segments (quick view)</label>
                    <pre className="h-40 w-full overflow-auto rounded-lg border p-2 text-xs">
                        {includedLines.join("\n")}
                    </pre>
                </div>
            </div>

            <p className="mt-6 text-xs text-gray-500">Note: Some wallets/scanners expect Name (59) and City (60). Excluding them may reduce compatibility even if the CRC is valid.</p>
        </div>
    );
}
