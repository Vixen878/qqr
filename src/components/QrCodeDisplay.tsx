"use client";

import React from "react";

type QrCodeDisplayProps = {
    payload: string;
};

export function QrCodeDisplay({ payload }: QrCodeDisplayProps) {
    const qrURL = payload ? `/api/qr?payload=${encodeURIComponent(payload)}` : "";

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">QR Preview</h2>
            {qrURL ? (
                <div className="rounded-xl border p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrURL} alt="QR" className="mx-auto h-auto w-64" />
                </div>
            ) : (
                <div className="rounded-xl border p-4 text-sm text-gray-500 dark:text-gray-400">
                    Enter details to generate a QR code.
                </div>
            )}
            {qrURL && (
                <a
                    href={qrURL}
                    download="qr.svg"
                    className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                    Download QR (SVG)
                </a>
            )}
        </div>
    );
}