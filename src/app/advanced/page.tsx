"use client";

import { useMemo, useState } from "react";
import { crc16CCITTFALSE, PLATFORM_BIC } from "@/lib/emvqr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Local TLV helpers (client-side)
const byteLen = (s: string) => new TextEncoder().encode(s).length;
const len2 = (s: string) => byteLen(s).toString().padStart(2, "0");
const tlv = (tag: string, value: string) => `${tag}${len2(value)}${value}`;

type Layout = "cbe" | "spec";

export default function StructuredPage() {
    // Defaults from your sample structure
    const [poiMethod] = useState("11");
    const [bic, setBic] = useState(PLATFORM_BIC.cbe); // CBETETAA
    const [guid, setGuid] = useState("1000123456789");
    const [account, setAccount] = useState("1000123456789");
    const [mcc, setMcc] = useState("0000");
    const [currency] = useState("230");
    const [country] = useState("ET");
    const [name, setName] = useState("YOUR FULL NAME");
    const [city, setCity] = useState("city");
    const [mobile, setMobile] = useState("+251-912345678");
    const [purpose, setPurpose] = useState("Payment for services");
    const [channel, setChannel] = useState("CBE Mobile Banking");
    const [store, setStore] = useState("cbeSt");
    const [terminal, setTerminal] = useState("cbeTi");
    const [amount, setAmount] = useState("500");
    const [context80, setContext80] = useState("Pay");
    const [layout, setLayout] = useState<Layout>("cbe"); // tag order toggle

    // Toggles to include/exclude sections
    const [incGuid, setIncGuid] = useState(true); // 28/00
    const [incMCC, setIncMCC] = useState(true); // 52
    const [incAmount, setIncAmount] = useState(true); // 54
    const [incName, setIncName] = useState(true); // 59
    const [incCity, setIncCity] = useState(true); // 60
    const [inc62Mobile, setInc62Mobile] = useState(true); // 62/02
    const [inc62Purpose, setInc62Purpose] = useState(true); // 62/08
    const [inc62Channel, setInc62Channel] = useState(true); // 62/11
    const [inc62Store, setInc62Store] = useState(true); // 62/03
    const [inc62Terminal, setInc62Terminal] = useState(true); // 62/07
    const [inc80, setInc80] = useState(true); // 80

    // Build payload with selectable tag order:
    // spec: 00,01,28,52,53,54,58,59,60,62,80,63
    // cbe : 00,01,28,52,53,58,59,60,62,54,80,63
    const payload = useMemo(() => {
        const parts: string[] = [];
        parts.push(tlv("00", "01")); // Payload Format Indicator
        parts.push(tlv("01", poiMethod)); // Static/Dynamic

        // Tag 28 (Merchant Account Information - IPS-ET)
        const mai: string[] = [];
        if (incGuid) mai.push(tlv("00", guid)); // GUID
        mai.push(tlv("01", bic)); // BIC (e.g., CBETETAA)
        mai.push(tlv("02", account)); // Merchant account / phone
        parts.push(tlv("28", mai.join("")));

        if (incMCC) parts.push(tlv("52", mcc)); // MCC
        parts.push(tlv("53", currency)); // Currency (230 = ETB)

        // spec layout puts 54 before 58/59/60/62
        if (layout === "spec" && incAmount) parts.push(tlv("54", amount));

        parts.push(tlv("58", country)); // Country
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
        poiMethod,
        layout,
        incGuid,
        guid,
        bic,
        account,
        incMCC,
        mcc,
        currency,
        incAmount,
        amount,
        country,
        incName,
        name,
        incCity,
        city,
        inc62Mobile,
        mobile,
        inc62Purpose,
        purpose,
        inc62Channel,
        channel,
        inc62Store,
        store,
        inc62Terminal,
        terminal,
        inc80,
        context80,
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
        layout,
        incName,
        name,
        incCity,
        city,
        inc62Mobile,
        mobile,
        inc62Purpose,
        purpose,
        inc62Channel,
        channel,
        inc62Store,
        store,
        inc62Terminal,
        terminal,
        incAmount,
        amount,
        inc80,
        context80,
    ]);

    // UI
    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="flex justify-between">
                <h1 className="mb-2 text-2xl font-semibold">Structured QR Builder (toggle sections)</h1>
                <Link href="/" passHref>
                    <Button className="ml-4">Simple</Button>
                </Link>
            </div>

            <p className="mb-6 text-sm text-gray-600">
                Generate a CBE-style payload and include/exclude specific TLV segments like <code>59</code> (Name), <code>60</code> (City), <code>62/02</code> (Mobile), etc.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    {/* Core Routing (Tag 28) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Core Routing (Tag 28)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-2 grid grid-cols-2 gap-2">
                                <div>
                                    <Label htmlFor="bic" className="mb-1">
                                        BIC (28/01)
                                    </Label>
                                    <Input id="bic" value={bic} onChange={(e) => setBic(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="account" className="mb-1">
                                        Account (28/02)
                                    </Label>
                                    <Input id="account" value={account} onChange={(e) => setAccount(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="inc-guid"
                                    checked={incGuid}
                                    onCheckedChange={(checked) => setIncGuid(checked === true)}
                                />
                                <Label htmlFor="inc-guid">Include GUID (28/00)</Label>
                            </div>
                            {incGuid && (
                                <div className="mt-2">
                                    <Input
                                        aria-label="GUID (28/00)"
                                        placeholder="GUID (28/00)"
                                        value={guid}
                                        onChange={(e) => setGuid(e.target.value)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Merchant Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Merchant Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-name"
                                    checked={incName}
                                    onCheckedChange={(checked) => setIncName(checked === true)}
                                />
                                <Label htmlFor="toggle-name">Name (59) - exactly like on you account</Label>
                                {incName && (
                                    <Input
                                        aria-label="Name (59)"
                                        placeholder="Name (59)"
                                        className="ml-auto"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-city"
                                    checked={incCity}
                                    onCheckedChange={(checked) => setIncCity(checked === true)}
                                />
                                <Label htmlFor="toggle-city">City (60)</Label>
                                {incCity && (
                                    <Input
                                        aria-label="City (60)"
                                        placeholder="City (60)"
                                        className="ml-auto"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction & Locale */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction & Locale</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Tag order toggle */}
                            <div className="mb-2">
                                <Label className="mb-1 block text-xs" htmlFor="layout-select">
                                    Tag Order
                                </Label>
                                <Select value={layout} onValueChange={(v) => setLayout(v as Layout)}>
                                    <SelectTrigger id="layout-select">
                                        <SelectValue placeholder="Select layout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cbe">CBE layout (54 after 62)</SelectItem>
                                        <SelectItem value="spec">Spec-ascending (54 before 58/59/60/62)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="toggle-mcc" checked={incMCC} onChange={(e) => setIncMCC((e.target as HTMLInputElement).checked)} />
                                    <Label htmlFor="toggle-mcc">MCC (52)</Label>
                                    {incMCC && (
                                        <Input
                                            aria-label="MCC (52)"
                                            placeholder="MCC (52)"
                                            className="ml-auto"
                                            value={mcc}
                                            onChange={(e) => setMcc(e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="toggle-amount" checked={incAmount} onChange={(e) => setIncAmount((e.target as HTMLInputElement).checked)} />
                                    <Label htmlFor="toggle-amount">Amount (54)</Label>
                                    {incAmount && (
                                        <Input
                                            aria-label="Amount (54)"
                                            placeholder="Amount (54)"
                                            className="ml-auto"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Currency (53):</span> {currency}
                                </div>
                                <div>
                                    <span className="text-gray-500">Country (58):</span> {country}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Data (62) & Context (80) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Data (62) & Context (80)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-62-mobile"
                                    checked={inc62Mobile}
                                    onCheckedChange={(checked) => setInc62Mobile(checked === true)}
                                />
                                <Label htmlFor="toggle-62-mobile">Mobile (62/02)</Label>
                                {inc62Mobile && (
                                    <Input
                                        aria-label="Mobile (62/02)"
                                        placeholder="Mobile (62/02)"
                                        className="ml-auto"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-62-purpose"
                                    checked={inc62Purpose}
                                    onCheckedChange={(checked) => setInc62Purpose(checked === true)}
                                />
                                <Label htmlFor="toggle-62-purpose">Purpose (62/08)</Label>
                                {inc62Purpose && (
                                    <Input
                                        aria-label="Purpose (62/08)"
                                        placeholder="Purpose (62/08)"
                                        className="ml-auto"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-62-channel"
                                    checked={inc62Channel}
                                    onCheckedChange={(checked) => setInc62Channel(checked === true)}
                                />
                                <Label htmlFor="toggle-62-channel">Channel (62/11)</Label>
                                {inc62Channel && (
                                    <Input
                                        aria-label="Channel (62/11)"
                                        placeholder="Channel (62/11)"
                                        className="ml-auto"
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-62-store"
                                    checked={inc62Store}
                                    onCheckedChange={(checked) => setInc62Store(checked === true)}
                                />
                                <Label htmlFor="toggle-62-store">Store (62/03)</Label>
                                {inc62Store && (
                                    <Input
                                        aria-label="Store (62/03)"
                                        placeholder="Store (62/03)"
                                        className="ml-auto"
                                        value={store}
                                        onChange={(e) => setStore(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-62-terminal"
                                    checked={inc62Terminal}
                                    onCheckedChange={(checked) => setInc62Terminal(checked === true)}
                                />
                                <Label htmlFor="toggle-62-terminal">Terminal (62/07)</Label>
                                {inc62Terminal && (
                                    <Input
                                        aria-label="Terminal (62/07)"
                                        placeholder="Terminal (62/07)"
                                        className="ml-auto"
                                        value={terminal}
                                        onChange={(e) => setTerminal(e.target.value)}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="toggle-80"
                                    checked={inc80}
                                    onCheckedChange={(checked) => setInc80(checked === true)}
                                />
                                <Label htmlFor="toggle-80">Top-level Context (80)</Label>
                                {inc80 && (
                                    <Input
                                        aria-label="Top-level Context (80)"
                                        placeholder="Top-level Context (80)"
                                        className="ml-auto"
                                        value={context80}
                                        onChange={(e) => setContext80(e.target.value)}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button onClick={() => navigator.clipboard.writeText(payload)}>
                            Copy Payload
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={qrURL} download="qr.svg">Download QR (SVG)</a>
                        </Button>
                    </div>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>QR Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrURL} alt="QR" className="mx-auto h-auto w-64" />
                        </CardContent>
                    </Card>

                    <Label className="mb-2 mt-4 block text-sm font-medium">Raw Payload</Label>
                    <Textarea readOnly value={payload} className="h-40" />

                    <Label className="mb-2 mt-4 block text-sm font-medium">Included Segments (quick view)</Label>
                    <Textarea readOnly value={includedLines.join("\n")} className="h-40" />
                </div>
            </div>
        </div>
    );
}
